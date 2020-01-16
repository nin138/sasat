import { CommandResponse, DBClient, QueryResponse, SQLTransaction } from '../dbClient';
import * as mysql from 'mysql';
import { MySqlTransaction } from './transaction';
import { config } from '../../config/config';
import { promisify } from 'util';

const connectionConfig = { ...config().db, dateStrings: false };
export class MysqlClient extends DBClient {
  private readonly pool: mysql.Pool;
  constructor() {
    super();
    this.pool = mysql.createPool(connectionConfig);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = mysql.createConnection(connectionConfig);
    await promisify(connection.beginTransaction).bind(connection)();
    await promisify(connection.query).bind(connection)('SET autocommit = 1');
    return new MySqlTransaction(connection);
  }

  release(): Promise<void> {
    return promisify(this.pool.end).bind(this.pool)();
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return promisify(this.pool.query).bind(this.pool)(sql) as Promise<QueryResponse | CommandResponse>;
  }
}
