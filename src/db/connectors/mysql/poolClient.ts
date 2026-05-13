import {
  ConnectionOptions,
  createConnection,
  createPool,
  Pool,
  PoolOptions,
} from 'mysql2/promise';
import {
  CommandResponse,
  DBClient,
  QueryResponse,
  SQLTransaction,
} from '../dbClient.js';
import { MySqlTransaction } from './transaction.js';
import { config } from '@/config/config.js';

export class MysqlPoolClient extends DBClient {
  private readonly pool: Pool;
  constructor(
    readonly connectionOption?: Partial<ConnectionOptions>,
    poolOption?: Partial<PoolOptions>,
    logger?: (query: string) => void,
  ) {
    super(logger);
    this.pool = createPool({
      ...config().db,
      dateStrings: true,
      ...connectionOption,
      ...poolOption,
    });
    this.release = this.release.bind(this);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await createConnection({
      ...config().db,
      dateStrings: true,
      ...this.connectionOption,
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
