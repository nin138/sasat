import * as mysql from 'mysql2/promise';
import { config } from '../../../config/config.js';
import {
  CommandResponse,
  DBClient,
  QueryResponse,
  SQLTransaction,
  SQLValueType,
} from '../intefaces.js';
import { MySqlTransaction } from './transaction.js';

const defaultConfig = { ...config().db, dateStrings: true };

export class MysqlClient implements DBClient {
  private readonly pool: mysql.Pool;
  private _released: boolean;
  constructor(
    readonly connectionOption?: Partial<mysql.ConnectionOptions>,
    poolOption?: Partial<mysql.PoolOptions>,
  ) {
    this._released = false;
    this.pool = mysql.createPool({
      ...defaultConfig,
      ...connectionOption,
      ...poolOption,
    });
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await mysql.createConnection({
      ...defaultConfig,
      ...this.connectionOption,
    });
    await connection.beginTransaction();
    return new MySqlTransaction(connection);
  }

  async release(): Promise<void> {
    await this.pool.end();
    this._released = true;
  }

  protected execute(
    sql: string,
    values: SQLValueType[],
  ): Promise<QueryResponse | CommandResponse> {
    return this.pool.execute(sql, values) as unknown as Promise<
      QueryResponse | CommandResponse
    >;
  }

  command(sql: string, values: SQLValueType[]): Promise<CommandResponse> {
    return this.execute(sql, values) as Promise<CommandResponse>;
  }

  query(sql: string, values: SQLValueType[]): Promise<QueryResponse> {
    return this.execute(sql, values) as Promise<QueryResponse>;
  }

  released(): boolean {
    return this._released;
  }
}
