import type { SasatDBConfigBase } from "../config/config.js";
import { PostgresClient } from "../db/connectors/postgres/client.js";
import { withDialect } from "../db/dialect.js";
import { SqlString } from "../runtime/sql/sqlString.js";

export class PostgresTestDBClient extends PostgresClient {
  private dropped = false;
  private constructor(private readonly settings: SasatDBConfigBase) {
    super(settings);
  }
  static async create(settings: SasatDBConfigBase) {
    const admin = new PostgresClient({ ...settings, database: "postgres" });
    try {
      await admin.rawQuery(
        withDialect(
          "postgres",
          () => `CREATE DATABASE ${SqlString.escapeId(settings.database)}`,
        ),
      );
    } finally {
      await admin.release();
    }
    return new PostgresTestDBClient(settings);
  }
  override async release(): Promise<void> {
    await super.release();
    if (this.dropped) return;
    const admin = new PostgresClient({
      ...this.settings,
      database: "postgres",
    });
    try {
      await admin.rawQuery(
        withDialect(
          "postgres",
          () =>
            `DROP DATABASE IF EXISTS ${SqlString.escapeId(this.settings.database)}`,
        ),
      );
      this.dropped = true;
    } finally {
      await admin.release();
    }
  }
}
