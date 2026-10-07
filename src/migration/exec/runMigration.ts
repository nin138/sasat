import type { MigrateCommandOption } from "@/cli/commands/migrate.js";
import { Console } from "@/cli/console.js";
import { config, setConfig } from "@/config/config.js";
import type { DBClient } from "@/db/connectors/dbClient.js";
import { sqlFor } from "../../db/sqlGenerator.js";
import type { SasatMigration } from "../front/migration.js";
import type { StoreMigrator } from "../front/storeMigrator.js";
import { Direction } from "./getCurrentMigration.js";

export class MigrationPostCommitError extends Error {
  readonly committed = true;
  constructor(migrationName: string, direction: Direction, cause: unknown) {
    super(
      `Migration ${migrationName} (${direction}) committed, but its afterCommit hook failed. Database changes and history are retained; retry the external work separately.`,
      { cause },
    );
    this.name = "MigrationPostCommitError";
  }
}

export const runMigration = async (
  client: DBClient,
  store: StoreMigrator,
  migrationName: string,
  direction: Direction,
  options: MigrateCommandOption,
  migration?: SasatMigration,
): Promise<void> => {
  const sqls = store.getSql();
  const conf = store.getUpdateConfig();
  if (conf) setConfig(conf);
  store.resetQueue();
  if (!options.silent) sqls.forEach(Console.log);
  if (options.dry) return;

  const transaction = await client.transaction();
  const context = { db: transaction, migrationName, direction };
  try {
    if (direction === Direction.Up) await migration?.beforeUp?.(context);
    else await migration?.beforeDown?.(context);
    for (const sql of sqls) {
      await transaction.rawQuery(sql).catch((e: Error) => {
        Console.error(`ERROR ON ${migrationName}`);
        Console.error(`SQL: ${sql}`);
        Console.error(`MESSAGE: ${e.message}`);
        throw e;
      });
    }
    if (direction === Direction.Up) await migration?.afterUp?.(context);
    else await migration?.afterDown?.(context);
    await transaction.query`insert into ${() =>
      sqlFor(transaction).escapeId(
        config().migration.table,
      )} (name, direction) values (${[migrationName, direction]})`;
    await transaction.commit();
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        `Migration ${migrationName} failed and rollback also failed; inspect database state before retrying.`,
      );
    }
    throw error;
  }
  try {
    const committed = { migrationName, direction };
    if (direction === Direction.Up) await migration?.afterCommitUp?.(committed);
    else await migration?.afterCommitDown?.(committed);
  } catch (error) {
    throw new MigrationPostCommitError(migrationName, direction, error);
  }
};
