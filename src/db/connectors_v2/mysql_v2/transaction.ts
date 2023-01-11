import * as mysql from 'mysql2/promise';
import {
  CommandResponse,
  QueryResponse,
  SQLTransaction,
  SQLValueType,
} from '../intefaces.js';

export class MySqlTransaction implements SQLTransaction {
  constructor(private connection: mysql.Connection) {}

  query(sql: string, values: SQLValueType[]): Promise<QueryResponse> {
    return this.execute(sql, values) as Promise<QueryResponse>;
  }

  command(sql: string, values: SQLValueType[]): Promise<CommandResponse> {
    return this.execute(sql, values) as Promise<CommandResponse>;
  }

  async commit(): Promise<void> {
    await this.connection.commit();
    await this.connection.end();
    return;
  }

  async rollback(): Promise<void> {
    await this.connection.rollback();
    await this.connection.end();
    return;
  }

  protected execute(
    sql: string,
    values: SQLValueType[],
  ): Promise<QueryResponse | CommandResponse> {
    return this.connection.execute(sql, values) as unknown as Promise<
      QueryResponse | CommandResponse
    >;
  }
}
