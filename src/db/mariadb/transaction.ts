import * as maria from 'mariadb';
import { CommandResponse, QueryResponse, SQLTransaction } from '../dbClient';

export class MariaDBTransaction extends SQLTransaction {
  constructor(private connection: maria.Connection) {
    super();
  }

  commit(): Promise<void> {
    const result = this.connection.commit();
    this.connection.end();
    return result;
  }

  async rollback() {
    const result = await this.connection.rollback();
    this.connection.end();
    return result;
  }

  protected async execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return this.connection.query(sql);
  }
}
