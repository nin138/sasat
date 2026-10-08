import type { Pool, PoolOptions } from "mysql2/promise";
import { config } from "@/config/config.js";
import { loadDriver } from "../../loadDriver.js";
import type { SqlStatement } from "../../sqlStatement.js";
import {
  type CommandResponse,
  DBClient,
  type QueryResponse,
  type SQLTransaction,
} from "../dbClient.js";
import { mysqlNumericOptions, normalizeMysqlResult } from "./numeric.js";
import { MySqlTransaction } from "./transaction.js";

export class MysqlPoolClient extends DBClient {
  override get supportsParameterizedStatements(): boolean {
    return true;
  }
  private pool?: Promise<Pool>;
  constructor(
    readonly poolOption: PoolOptions,
    logger?: (query: string) => void,
  ) {
    super(logger);
    this.release = this.release.bind(this);
  }

  private getPool(): Promise<Pool> {
    if (this._released) throw new Error("Database client has been released");
    this.pool ??= loadDriver("mysql2", () => import("mysql2/promise")).then(
      ({ createPool }) =>
        createPool({
          dateStrings: true,
          ...mysqlNumericOptions,
          ...this.poolOption,
        }),
    );
    return this.pool;
  }

  async transaction(): Promise<SQLTransaction> {
    if (this._released) throw new Error("Database client has been released");
    const { createConnection } = await loadDriver(
      "mysql2",
      () => import("mysql2/promise"),
    );
    const { dialect: _dialect, ...connectionConfig } = config().db;
    const connection = await createConnection({
      ...connectionConfig,
      dateStrings: true,
      ...mysqlNumericOptions,
      ...this.poolOption,
    });
    try {
      await connection.beginTransaction();
      return new MySqlTransaction(connection, this.sql);
    } catch (error) {
      await connection.end();
      throw error;
    }
  }

  async release(): Promise<void> {
    if (this._released) return;
    this._released = true;
    const pool = await this.pool?.catch(() => undefined);
    await pool?.end();
  }

  protected async execStatement(
    statement: SqlStatement,
  ): Promise<QueryResponse | CommandResponse> {
    return normalizeMysqlResult(
      (
        await (
          await this.getPool()
        ).execute(statement.text, [...statement.values])
      )[0],
    );
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    return normalizeMysqlResult((await (await this.getPool()).query(sql))[0]);
  }
}
