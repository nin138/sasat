import {
  createConnection,
  createPool,
  Pool,
  PoolOptions,
} from 'mysql2/promise';
import { config } from '@/config/config.js';
import {
  CommandResponse,
  DBClient,
  QueryResponse,
  SQLTransaction,
} from '../dbClient.js';
import { MySqlTransaction } from './transaction.js';

export class MysqlPoolClient extends DBClient {
  private readonly pool: Pool;
  constructor(
    readonly poolOption: PoolOptions,
    logger?: (query: string) => void,
  ) {
    super(logger);
    this.pool = createPool({
      dateStrings: true,
      ...poolOption,
    });
    this.release = this.release.bind(this);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await createConnection({
      ...config().db,
      dateStrings: true,
      ...this.poolOption,
    });
    await connection.beginTransaction();
    return new MySqlTransaction(connection);
  }

  async release(): Promise<void> {
    await this.pool.end();
    this._released = true;
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    return (await this.pool.query(sql))[0] as QueryResponse | CommandResponse;
  }
}
