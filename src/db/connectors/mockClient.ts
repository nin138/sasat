import type { SqlStatement } from "../sqlStatement.js";
import { DBClient, SQLTransaction } from "./dbClient.js";

class MockDBTransaction extends SQLTransaction {
  override get supportsParameterizedStatements(): boolean {
    return true;
  }
  commit(): Promise<void> {
    return Promise.resolve();
  }

  protected execStatement(_statement: SqlStatement, kind: "query" | "command") {
    return Promise.resolve(
      kind === "query" ? [] : { insertId: 0, affectedRows: 0, changedRows: 0 },
    );
  }

  protected execSql() {
    return Promise.resolve([]);
  }

  rollback(): Promise<void> {
    return Promise.resolve();
  }
}

export class MockDBClient extends DBClient {
  override get supportsParameterizedStatements(): boolean {
    return true;
  }
  protected execStatement(_statement: SqlStatement, kind: "query" | "command") {
    return Promise.resolve(
      kind === "query" ? [] : { insertId: 0, affectedRows: 0, changedRows: 0 },
    );
  }

  protected execSql() {
    return Promise.resolve([]);
  }

  release(): Promise<void> {
    return Promise.resolve(undefined);
  }

  transaction() {
    return Promise.resolve(new MockDBTransaction(this.sql));
  }
}
