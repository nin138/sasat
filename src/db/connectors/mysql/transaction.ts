import type { Connection } from "mysql2/promise";
import { createSqlGenerator, type SqlGenerator } from "../../sqlGenerator.js";
import type { SqlStatement } from "../../sqlStatement.js";
import {
  type CommandResponse,
  type QueryResponse,
  SQLTransaction,
} from "../dbClient.js";
import { normalizeMysqlResult } from "./numeric.js";

export class MySqlTransaction extends SQLTransaction {
  override get supportsParameterizedStatements(): boolean {
    return true;
  }
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

  protected async execStatement(
    statement: SqlStatement,
  ): Promise<QueryResponse | CommandResponse> {
    return normalizeMysqlResult(
      (await this.connection.execute(statement.text, [...statement.values]))[0],
    );
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    return normalizeMysqlResult((await this.connection.query(sql))[0]);
  }
}
