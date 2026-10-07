import type { Pool, PoolClient, PoolConfig, QueryResult, types } from "pg";
import { loadDriver } from "../../loadDriver.js";
import {
  type CommandResponse,
  DBClient,
  type QueryResponse,
  SQLTransaction,
} from "../dbClient.js";

// Preserve SQL date strings without changing pg's global type parsers.
const typeOverrides = (parsers: typeof types) => ({
  getTypeParser(oid: number, format?: "text" | "binary") {
    if (format !== "binary" && oid === 20)
      return (value: string) => {
        const number = Number(value);
        return Number.isSafeInteger(number) ? number : value;
      };
    if (format !== "binary" && [1082, 1114, 1184].includes(oid))
      return (value: string) => value;
    return parsers.getTypeParser(oid, format);
  },
});

function lastResult(result: QueryResult | QueryResult[]): QueryResult {
  return Array.isArray(result) ? result[result.length - 1] : result;
}
function commandResponse(result: QueryResult): CommandResponse {
  const id = result.rows[0]?.__sasat_insert_id;
  const insertId = id == null ? 0 : Number(id);
  if (!Number.isSafeInteger(insertId))
    throw new Error("Inserted ID exceeds JavaScript's safe integer range");
  return {
    insertId,
    affectedRows: result.rowCount ?? 0,
    changedRows: result.command === "UPDATE" ? (result.rowCount ?? 0) : 0,
  };
}

export class PostgresClient extends DBClient {
  override readonly dialect = "postgres" as const;
  private pool?: Promise<Pool>;
  constructor(
    readonly poolOption: PoolConfig,
    logger?: (query: string) => void,
  ) {
    super(logger);
  }
  private getPool(): Promise<Pool> {
    if (this._released) throw new Error("Database client has been released");
    this.pool ??= loadDriver("pg", () => import("pg")).then(
      ({ Pool, types }) => {
        const pool = new Pool({
          types: typeOverrides(types),
          ...this.poolOption,
        });
        pool.on("error", () =>
          console.error("PostgreSQL idle connection error"),
        );
        return pool;
      },
    );
    return this.pool;
  }
  protected async execSql(sql: string): Promise<QueryResponse> {
    return lastResult(await (await this.getPool()).query(sql))
      .rows as QueryResponse;
  }
  override async rawCommand(sql: string): Promise<CommandResponse> {
    this.logger(sql);
    return commandResponse(lastResult(await (await this.getPool()).query(sql)));
  }
  async transaction(): Promise<SQLTransaction> {
    const client = await (await this.getPool()).connect();
    try {
      await client.query("BEGIN");
      return new PostgresTransaction(client, this.logger);
    } catch (error) {
      client.release(true);
      throw error;
    }
  }
  async release(): Promise<void> {
    if (this._released) return;
    this._released = true;
    const pool = await this.pool?.catch(() => undefined);
    await pool?.end();
  }
}

class PostgresTransaction extends SQLTransaction {
  override readonly dialect = "postgres" as const;
  private finished = false;
  constructor(
    private readonly client: PoolClient,
    logger: (query: string) => void,
  ) {
    super();
    this.logger = logger;
  }
  private assertActive() {
    if (this.finished) throw new Error("Transaction has already finished");
  }
  protected async execSql(sql: string): Promise<QueryResponse> {
    this.assertActive();
    return lastResult(await this.client.query(sql)).rows as QueryResponse;
  }
  override async rawCommand(sql: string): Promise<CommandResponse> {
    this.assertActive();
    this.logger(sql);
    return commandResponse(lastResult(await this.client.query(sql)));
  }
  private async finish(command: "COMMIT" | "ROLLBACK") {
    if (this.finished) return;
    this.finished = true;
    let failed = false;
    try {
      await this.client.query(command);
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      this.client.release(failed);
    }
  }
  commit() {
    return this.finish("COMMIT");
  }
  rollback() {
    return this.finish("ROLLBACK");
  }
}
