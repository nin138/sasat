import { CommandResponse, DBClient, QueryResponse, SQLTransaction } from "./dbClient";
import * as mysql from "mysql";
import { promisify } from "util";
import { config } from "../config/config";

export class MysqlDBClient extends DBClient {
  private readonly pool: mysql.Pool;
  constructor() {
    super();
    this.pool = mysql.createPool(config().db);
  }

  async transaction(): Promise<SQLTransaction> {
    const connection = mysql.createConnection(config().db);
    await promisify(connection.beginTransaction).bind(connection)();
    await promisify(connection.query).bind(connection)("SET autocommit = 1");
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
  constructor(private connection: mysql.Connection) {
    super();
  }

  commit(): Promise<void> {
    const result = promisify(this.connection.commit).bind(this.connection)();
    this.connection.end();
    return result;
  }

  async rollback() {
    const result = await promisify(this.connection.rollback).bind(this.connection)();
    this.connection.end();
    return result;
  }

  protected execSql(sql: string): Promise<QueryResponse | CommandResponse> {
    return promisify(this.connection.query).bind(this.connection)(sql) as any;
  }
}
