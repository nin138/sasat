import {
  DBClient,
  type QueryResponse,
  SQLTransaction,
} from "../../db/connectors/dbClient.js";
import type { SqlStatement } from "../../db/sqlStatement.js";

// A reserved session carries both the advisory lock and each migration transaction.
// This also works with a PostgreSQL pool whose maximum size is one.
class MigrationSession extends DBClient {
  private active = false;
  constructor(private readonly session: SQLTransaction) {
    super(undefined, session.sql);
  }
  protected execSql(sql: string): Promise<QueryResponse> {
    if (this._released) throw new Error("Migration session has been released");
    return this.session.rawQuery(sql);
  }
  protected execStatement(statement: SqlStatement, kind: "query" | "command") {
    if (this._released) throw new Error("Migration session has been released");
    return kind === "query"
      ? this.session.executeQuery(statement)
      : this.session.executeCommand(statement);
  }
  override rawCommand(sql: string) {
    if (this._released) throw new Error("Migration session has been released");
    return this.session.rawCommand(sql);
  }
  async transaction(): Promise<SQLTransaction> {
    if (this.active)
      throw new Error("Nested migration transactions are not supported");
    this.active = true;
    try {
      await this.rawQuery("BEGIN");
    } catch (error) {
      this.active = false;
      throw error;
    }
    return new MigrationTransaction(this, () => {
      this.active = false;
    });
  }
  async release(): Promise<void> {
    this._released = true;
  }
}

class MigrationTransaction extends SQLTransaction {
  private finished = false;
  constructor(
    private readonly session: MigrationSession,
    private readonly onFinish: () => void,
  ) {
    super(session.sql);
  }
  private assertActive() {
    if (this.finished) throw new Error("Transaction has already finished");
  }
  protected execSql(sql: string) {
    this.assertActive();
    return this.session.rawQuery(sql);
  }
  protected execStatement(statement: SqlStatement, kind: "query" | "command") {
    this.assertActive();
    return kind === "query"
      ? this.session.executeQuery(statement)
      : this.session.executeCommand(statement);
  }
  override rawCommand(sql: string) {
    this.assertActive();
    return this.session.rawCommand(sql);
  }
  async commit(): Promise<void> {
    this.assertActive();
    // Keep rollback possible if COMMIT fails.
    await this.session.rawQuery("COMMIT");
    this.finished = true;
    this.onFinish();
  }
  async rollback(): Promise<void> {
    if (this.finished) return;
    try {
      await this.session.rawQuery("ROLLBACK");
    } finally {
      this.finished = true;
      this.onFinish();
    }
  }
}

export async function withMigrationLock<T>(
  client: DBClient,
  apply: (session: DBClient) => Promise<T>,
): Promise<T> {
  const session = await client.transaction();
  const scoped = new MigrationSession(session);
  const postgres = client.dialect === "postgres";
  const key = postgres
    ? "hashtext('sasat:migration'), hashtext(current_database())"
    : "CONCAT('sasat:migration:', LEFT(SHA2(DATABASE(), 256), 48))";
  const acquire = postgres
    ? `pg_try_advisory_lock(${key})`
    : `GET_LOCK(${key}, 0)`;
  const unlock = postgres
    ? `pg_advisory_unlock(${key})`
    : `RELEASE_LOCK(${key})`;
  let acquired = false;
  let result: T | undefined;
  const errors: unknown[] = [];
  try {
    const rows = await session.rawQuery(`SELECT ${acquire} AS acquired`);
    const value = rows[0]?.acquired;
    acquired = value === true || value === 1 || value === 1n;
    if (!acquired) {
      if (value === false || value === 0 || value === 0n)
        throw new Error(
          "Another Sasat migration is running for this database. Retry after it finishes.",
        );
      throw new Error("Could not acquire the database migration lock");
    }
    await session.rawQuery("ROLLBACK");
    result = await apply(scoped);
  } catch (error) {
    errors.push(error);
  }
  await scoped.release();
  try {
    // Clear an aborted transaction before attempting to unlock the session.
    await session.rawQuery("ROLLBACK");
    if (acquired) {
      const rows = await session.rawQuery(`SELECT ${unlock} AS released`);
      if (
        rows[0]?.released !== true &&
        rows[0]?.released !== 1 &&
        rows[0]?.released !== 1n
      ) {
        throw new Error("Could not release the database migration lock");
      }
    }
    // A failed acquire query could still have acquired the session lock if its
    // response was lost. Destroy that session instead of returning it to a pool.
    if (!acquired) await session.discard();
    else await session.rollback();
  } catch (error) {
    errors.push(error);
    try {
      await session.discard();
    } catch (discardError) {
      errors.push(discardError);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1)
    throw new AggregateError(
      errors,
      "Migration failed and session cleanup also failed; inspect database state before retrying.",
    );
  return result as T;
}
