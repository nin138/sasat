import type { Connection } from "mysql2/promise";
import {
  type CommandResponse,
  type QueryResponse,
  SQLTransaction,
} from "../dbClient.js";

export class MySqlTransaction extends SQLTransaction {
  constructor(private connection: Connection) {
    super();
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
    return (await this.connection.query(sql))[0] as
      | QueryResponse
      | CommandResponse;
  }
}
