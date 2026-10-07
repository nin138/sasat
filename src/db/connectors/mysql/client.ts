import type { ConnectionOptions } from "mysql2/promise";
import { loadDriver } from "../../loadDriver.js";
import {
  type CommandResponse,
  DBClient,
  type QueryResponse,
  type SQLTransaction,
} from "../dbClient.js";
import { mysqlNumericOptions, normalizeMysqlResult } from "./numeric.js";
import { MySqlTransaction } from "./transaction.js";

export class MysqlClient extends DBClient {
  async release(): Promise<void> {
    return;
  }
  constructor(
    readonly connectionOption: ConnectionOptions,
    logger?: (query: string) => void,
  ) {
    super(logger);
  }

  protected async getConnection() {
    const { createConnection } = await loadDriver(
      "mysql2",
      () => import("mysql2/promise"),
    );
    return createConnection({
      dateStrings: true,
      ...mysqlNumericOptions,
      ...this.connectionOption,
    });
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      return new MySqlTransaction(connection, this.sql);
    } catch (error) {
      await connection.end();
      throw error;
    }
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    const connection = await this.getConnection();
    try {
      const r = await connection.query(sql);
      return normalizeMysqlResult(r[0]);
    } finally {
      await connection.end();
    }
  }
}
