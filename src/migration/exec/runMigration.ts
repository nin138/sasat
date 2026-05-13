import { DBClient } from '@/db/connectors/dbClient.js';
import { StoreMigrator } from '../front/storeMigrator.js';
import { Console } from '@/cli/console.js';
import { Direction } from './getCurrentMigration.js';
import { config, setConfig } from '@/config/config.js';
import { MigrateCommandOption } from '@/cli/commands/migrate.js';

export const runMigration = async (
  client: DBClient,
  store: StoreMigrator,
  migrationName: string,
  direction: Direction,
  options: MigrateCommandOption,
) => {
  const sqls = store.getSql();
  const conf = store.getUpdateConfig();
  if (conf) {
    setConfig(conf);
  }
  store.resetQueue();
  if (!options.silent) {
    sqls.forEach(Console.log);
  }
  if (options.dry) {
    return;
  }
  const transaction = await client.transaction();
  try {
    for (const sql of sqls) {
      await transaction.rawQuery(sql).catch((e: Error) => {
        Console.error(`ERROR ON ${migrationName}`);
        Console.error(`SQL: ${sql}`);
        Console.error(`MESSAGE: ${e.message}`);
        process.exit(1);
      });
    }
    await transaction.query`insert into ${() =>
      config().migration.table} (name, direction) values (${[
      migrationName,
      direction,
    ]})`;
    return await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};
