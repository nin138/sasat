import type { Pool, PoolClient, PoolConfig, QueryResult, types } from "pg";
import type { PostgresDriver } from "../../drivers.js";
import { loadDriver } from "../../loadDriver.js";
import {
  finishAndRelease,
  type TransactionOptions,
  transactionConnectionPolicy,
} from "../../managedTransaction.js";
import { createSqlGenerator, type SqlGenerator } from "../../sqlGenerator.js";
import type { SqlStatement } from "../../sqlStatement.js";
import {
  type CommandResponse,
  DBClient,
  type QueryResponse,
  SQLTransaction,
} from "../dbClient.js";
import { normalizeInsertId } from "../numeric.js";

// Preserve SQL date strings without changing pg's global type parsers.
const typeOverrides = (parsers: typeof types) => ({
  getTypeParser(oid: number, format?: "text" | "binary") {
    if (format !== "binary" && oid === 20)
      return (value: string) => BigInt(value);
    if (format !== "binary" && [1700, 1082, 1114, 1184].includes(oid))
      return (value: string) => value;
    return parsers.getTypeParser(oid, format);
  },
});

function lastResult(result: QueryResult | QueryResult[]): QueryResult {
  return Array.isArray(result) ? result[result.length - 1] : result;
}
function commandResponse(result: QueryResult): CommandResponse {
  const id = result.rows[0]?.__sasat_insert_id;
  const insertId = normalizeInsertId(id);
  return {
    insertId,
    affectedRows: result.rowCount ?? 0,
    changedRows: result.command === "UPDATE" ? (result.rowCount ?? 0) : 0,
  };
}

export class PostgresClient extends DBClient {
  override get supportsTransactionConnectionPolicy(): boolean {
    return true;
  }
  override get supportsParameterizedStatements(): boolean {
    return true;
  }
  private pool?: Promise<Pool>;
  constructor(
    readonly poolOption: PoolConfig,
    logger?: (query: string) => void,
    private readonly driver?: PostgresDriver,
  ) {
    super(logger, createSqlGenerator("postgres"));
  }
  private getPool(): Promise<Pool> {
    if (this._released) throw new Error("Database client has been released");
    this.pool ??= (
      this.driver ? Promise.resolve(this.driver) : loadDriver("pg")
    ).then(({ Pool, types }) => {
      const pool = new Pool({
        types: typeOverrides(types),
        ...this.poolOption,
      });
      pool.on("error", () => console.error("PostgreSQL idle connection error"));
      return pool;
    });
    return this.pool;
  }
  protected async execStatement(
    statement: SqlStatement,
    kind: "query" | "command",
  ): Promise<QueryResponse | CommandResponse> {
    const result = lastResult(
      await (await this.getPool()).query(statement.text, [...statement.values]),
    );
    return kind === "command"
      ? commandResponse(result)
      : (result.rows as QueryResponse);
  }
  protected async execSql(sql: string): Promise<QueryResponse> {
    return lastResult(await (await this.getPool()).query(sql))
      .rows as QueryResponse;
  }
  override async rawCommand(sql: string): Promise<CommandResponse> {
    this.logger(sql);
    return commandResponse(lastResult(await (await this.getPool()).query(sql)));
  }
  async transaction(options?: TransactionOptions): Promise<SQLTransaction> {
    const policy = transactionConnectionPolicy(options);
    const client = await (await this.getPool()).connect();
    try {
      await client.query("BEGIN");
      return new PostgresTransaction(client, this.logger, this.sql, policy);
    } catch (error) {
      await finishAndRelease(
        () => Promise.reject(error),
        () => client.release(true),
      );
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
  override get supportsParameterizedStatements(): boolean {
    return true;
  }
  private finished = false;
  constructor(
    private readonly client: PoolClient,
    logger: (query: string) => void,
    sql: SqlGenerator,
    private readonly connectionPolicy: "reuse" | "discard" = "reuse",
  ) {
    super(sql);
    this.logger = logger;
  }
  private assertActive() {
    if (this.finished) throw new Error("Transaction has already finished");
  }
  protected async execStatement(
    statement: SqlStatement,
    kind: "query" | "command",
  ): Promise<QueryResponse | CommandResponse> {
    this.assertActive();
    const result = lastResult(
      await this.client.query(statement.text, [...statement.values]),
    );
    return kind === "command"
      ? commandResponse(result)
      : (result.rows as QueryResponse);
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
    await finishAndRelease(
      async () => {
        await this.client.query(command);
      },
      (failed) =>
        this.client.release(failed || this.connectionPolicy === "discard"),
    );
  }
  override async discard(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    this.client.release(true);
  }
  commit() {
    return this.finish("COMMIT");
  }
  rollback() {
    return this.finish("ROLLBACK");
  }
}
