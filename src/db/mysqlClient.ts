import { CommandResponse, DBClient, QueryResponse, SQLTransaction } from "./dbClient";
import { DBConfig } from "./mariaDBClient";
import * as mysql from "mysql";
import { promisify } from "util";

export class MysqlDBClient extends DBClient {
  private readonly pool: mysql.Pool;
  constructor(config: DBConfig) {
    super();
    this.pool = mysql.createPool(config);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = await promisify(this.pool.getConnection).bind(this.pool)();
    await promisify(connection.beginTransaction).bind(connection)();
    await promisify(connection.query).bind(connection)("SET AUTOCOMMIT=0;");
    return new MySqlTransaction(connection);
  }

  release(): Promise<void> {
    return promisify(this.pool.end).bind(this.pool)();
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return promisify(this.pool.query).bind(this.pool)(sql) as any;
  }
}

export class MySqlTransaction extends SQLTransaction {
  constructor(private connection: mysql.PoolConnection) {
    super();
  }

  commit(): Promise<void> {
    const result = promisify(this.connection.commit).bind(this.connection)();
    this.connection.release();
    return result;
  }

  async rollback() {
    const result = await promisify(this.connection.rollback).bind(this.connection)();
    this.connection.release();
    return result;
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return promisify(this.connection.query).bind(this.connection)(sql) as any;
  }
}
