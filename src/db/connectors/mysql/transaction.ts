import { Connection } from 'mysql2/promise';
import { CommandResponse, QueryResponse, SQLTransaction } from '../dbClient.js';

export class MySqlTransaction extends SQLTransaction {
  constructor(private connection: Connection) {
    super();
  }

  async commit(): Promise<void> {
    const result = await this.connection.commit();
    await this.connection.end();
    return result;
  }

  async rollback(): Promise<void> {
    await this.connection.rollback();
    await this.connection.end();
    return;
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    return (await this.connection.query(sql))[0] as
      | QueryResponse
      | CommandResponse;
  }
}
