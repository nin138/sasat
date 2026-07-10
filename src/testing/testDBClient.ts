import type { ConnectionOptions } from "mysql2/promise";
import { MysqlClient } from "sasat";

export class TestDBClient extends MysqlClient {
  static async create(
    data: {
      host: string;
      port: number;
      user: string;
      password?: string;
      database: string;
    },
    logger?: (query: string) => void,
  ) {
    const c = new MysqlClient({
      host: data.host,
      port: data.port,
      user: data.user,
    });
    await c.rawQuery(`CREATE DATABASE ${data.database}`);
    await c.release();
    return new this({ ...data, multipleStatements: true }, logger);
  }
  private constructor(
    connectionOption: ConnectionOptions,
    logger?: (query: string) => void,
  ) {
    super(connectionOption, logger);
  }

  async release(): Promise<void> {
    await this.execSql(`DROP DATABASE ${this.connectionOption.database}`);
    await super.release();
  }
}
