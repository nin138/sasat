import { ConnectionOptions, createConnection } from 'mysql2/promise';
import {
  CommandResponse,
  DBClient,
  QueryResponse,
  SQLTransaction,
} from '../dbClient.js';
import { MySqlTransaction } from './transaction.js';

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
    await connection.beginTransaction();
    return new MySqlTransaction(connection);
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    const connection = await this.getConnection();
    const r = await connection.query(sql);
    await connection.end();
    return r[0] as QueryResponse | CommandResponse;
  }
}
