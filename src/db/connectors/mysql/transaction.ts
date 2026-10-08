import type { Connection } from "mysql2/promise";
import { finishAndRelease } from "../../managedTransaction.js";
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
  private finished = false;
  constructor(
    private connection: Connection,
    sql: SqlGenerator = createSqlGenerator("mysql"),
    private readonly releaseConnection: (
      discard: boolean,
    ) => void | Promise<void> = () => connection.end(),
  ) {
    super(sql);
  }

  private assertActive() {
    if (this.finished) throw new Error("Transaction has already finished");
  }

  private async finish(action: "commit" | "rollback"): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    await finishAndRelease(
      () => this.connection[action](),
      this.releaseConnection,
    );
  }

  commit(): Promise<void> {
    return this.finish("commit");
  }

  rollback(): Promise<void> {
    return this.finish("rollback");
  }

  override async discard(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    await this.releaseConnection(true);
  }

  protected async execStatement(
    statement: SqlStatement,
  ): Promise<QueryResponse | CommandResponse> {
    this.assertActive();
    return normalizeMysqlResult(
      (await this.connection.execute(statement.text, [...statement.values]))[0],
    );
  }

  protected async execSql(
    sql: string,
  ): Promise<QueryResponse | CommandResponse> {
    this.assertActive();
    return normalizeMysqlResult((await this.connection.query(sql))[0]);
  }
}
