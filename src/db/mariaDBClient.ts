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

  query(templateString: TemplateStringsArray, ...params: any[]): Promise<QueryResponse | CommandResponse> {
    return this.pool.query(this.formatQuery(templateString, ...params));
  }

  rawQuery(sql: string): Promise<QueryResponse | CommandResponse> {
    return this.pool.query(sql);
  }

  transaction(): Promise<SQLTransaction> {
    return this.pool.getConnection().then(async con => {
      const transaction = new MariaDBTransaction(con);
      await transaction.init();
      return transaction;
    });
  }

  release(): Promise<void> {
    return this.pool.end();
  }
}

export class MariaDBTransaction extends SQLTransaction {
  constructor(private connection: maria.PoolConnection) {
    super();
  }
  init(): Promise<void> {
    return this.connection.beginTransaction();
  }

  commit(): Promise<void> {
    const result = this.connection.commit();
    this.connection.release();
    return result;
  }

  rollback() {
    const result = this.connection.rollback();
    this.connection.release();
    return result;
  }

  query(templateString: TemplateStringsArray, ...params: any[]): Promise<QueryResponse> {
    return this.connection.query(this.formatQuery(templateString, ...params));
  }

  rawQuery(sql: string): Promise<QueryResponse> {
    return this.connection.query(sql);
  }
}
