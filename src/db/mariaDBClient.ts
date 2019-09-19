import { CommandResponse, DBClient, QueryResponse, SQLTransaction } from "./dbClient";
import * as maria from "mariadb";

export interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  connectTimeout?: number; // ms
  connectionLimit?: number;
}

export class MariaDBClient extends DBClient {
  private readonly pool: maria.Pool;
  constructor(config: DBConfig) {
    super();
    this.pool = maria.createPool(config);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return new MariaDBTransaction(connection);
  }

  release(): Promise<void> {
    return this.pool.end();
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return this.pool.query(sql);
  }
}

export class MariaDBTransaction extends SQLTransaction {
  constructor(private connection: maria.PoolConnection) {
    super();
  }

  commit(): Promise<void> {
    const result = this.connection.commit();
    this.connection.release();
    return result;
  }

  async rollback() {
    const result = await this.connection.rollback();
    this.connection.release();
    return result;
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return this.connection.query(sql);
  }
}
