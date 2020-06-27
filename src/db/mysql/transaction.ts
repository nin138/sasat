import * as mysql from 'mysql';
import { promisify } from 'util';
import { CommandResponse, QueryResponse, SQLTransaction } from '../dbClient';

export class MySqlTransaction extends SQLTransaction {
  constructor(private connection: mysql.Connection) {
    super();
  }

  commit(): Promise<void> {
    const result = promisify(this.connection.commit).bind(this.connection)();
    this.connection.end();
    return result;
  }

  async rollback() {
    const result = await promisify(this.connection.rollback).bind(
      this.connection,
    )();
    this.connection.end();
    return result;
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return promisify(this.connection.query).bind(this.connection)(
      sql,
    ) as Promise<QueryResponse | CommandResponse>;
  }
}
