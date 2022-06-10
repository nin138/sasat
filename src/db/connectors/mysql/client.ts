import { CommandResponse, DBClient, QueryResponse, SQLTransaction } from '../dbClient.js';
import * as mysql from 'mysql2';
import { MySqlTransaction } from './transaction.js';
import { config } from '../../../config/config.js';
import { promisify } from 'util';

const connectionConfig = { ...config().db, dateStrings: true };
export class MysqlClient extends DBClient {
  private readonly pool: mysql.Pool;
  constructor() {
    super();
    this.pool = mysql.createPool(connectionConfig);
    this.release = this.release.bind(this);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = mysql.createConnection(connectionConfig);
    await promisify(connection.beginTransaction).bind(connection)();
    return new MySqlTransaction(connection);
  }

  async release(): Promise<void> {
    await promisify(this.pool.end).bind(this.pool)();
    this._released = true;
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return promisify(this.pool.query).bind(this.pool)(sql as any) as Promise<QueryResponse | CommandResponse>;
  }
}
