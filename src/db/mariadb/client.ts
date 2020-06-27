import { CommandResponse, DBClient, QueryResponse, SQLTransaction } from '../dbClient';
import * as maria from 'mariadb';
import { config } from '../../config/config';
import { MariaDBTransaction } from './transaction';

const connectionConfig = { ...config().db, dateStrings: true };
export class MariaDBClient extends DBClient {
  private readonly pool: maria.Pool;
  constructor() {
    super();
    this.pool = maria.createPool(connectionConfig);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await maria.createConnection(connectionConfig);
    await connection.beginTransaction();
    await connection.query('SET autocommit = 1');
    return new MariaDBTransaction(connection);
  }

  async release(): Promise<void> {
    await this.pool.end();
    this._released = true;
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return this.pool.query(sql);
  }
}
