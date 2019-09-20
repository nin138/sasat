import { CommandResponse, DBClient, QueryResponse, SQLTransaction } from '../dbClient';
import * as maria from 'mariadb';
import { config } from '../../config/config';
import { MariaDBTransaction } from './transaction';

export class MariaDBClient extends DBClient {
  private readonly pool: maria.Pool;
  constructor() {
    super();
    this.pool = maria.createPool(config().db);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await maria.createConnection(config().db);
    await connection.beginTransaction();
    await connection.query('SET autocommit = 1');
    return new MariaDBTransaction(connection);
  }

  release(): Promise<void> {
    return this.pool.end();
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return this.pool.query(sql);
  }
}
