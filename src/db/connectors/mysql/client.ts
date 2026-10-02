import { type ConnectionOptions, createConnection } from "mysql2/promise";
import {
  type CommandResponse,
  DBClient,
  type QueryResponse,
  type SQLTransaction,
} from "../dbClient.js";
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

  protected getConnection() {
    return createConnection({
      dateStrings: true,
      ...this.connectionOption,
    });
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      return new MySqlTransaction(connection);
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
      return r[0] as QueryResponse | CommandResponse;
    } finally {
      await connection.end();
    }
  }
}
