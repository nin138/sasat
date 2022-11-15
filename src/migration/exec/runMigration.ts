import { StoreMigrator } from '../front/storeMigrator.js';
import { getDbClient } from '../../db/getDbClient.js';
import { Console } from '../../cli/console.js';
import { Direction } from './getCurrentMigration.js';
import { config } from '../../config/config.js';

export const runMigration = async (
  store: StoreMigrator,
  migrationName: string,
  direction: Direction,
) => {
  const sqls = store.getSql();
  store.resetQueue();
  const transaction = await getDbClient().transaction();
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
