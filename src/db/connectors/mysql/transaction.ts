import type { Connection } from "mysql2/promise";
import { createSqlGenerator, type SqlGenerator } from "../../sqlGenerator.js";
import {
  type CommandResponse,
  type QueryResponse,
  SQLTransaction,
} from "../dbClient.js";
import { normalizeMysqlResult } from "./numeric.js";

export class MySqlTransaction extends SQLTransaction {
  constructor(
    private connection: Connection,
    sql: SqlGenerator = createSqlGenerator("mysql"),
  ) {
    super(sql);
  }

  async commit(): Promise<void> {
    try {
      await this.connection.commit();
    } finally {
      await this.connection.end();
    }
  }

  async rollback(): Promise<void> {
    try {
      await this.connection.rollback();
    } finally {
      await this.connection.end();
    }
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    return normalizeMysqlResult((await this.connection.query(sql))[0]);
  }
}
