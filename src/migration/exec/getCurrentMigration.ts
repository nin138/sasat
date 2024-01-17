import { config } from '../../config/config.js';
import { getDbClient } from '../../db/getDbClient.js';
import { getMigrationFileNames } from './getMigrationFiles.js';
import * as console from 'console';
import { Console } from 'cli/console';
import { MigrateCommandOption } from 'cli/commands/migrate';

export enum Direction {
  Up = 'up',
  Down = 'down',
}

type MigrationRecord = {
  id: number;
  name: string;
  direction: Direction;
};

const calcRunMigrationFileNames = (records: MigrationRecord[]) => {
  const result: string[] = [];
  records.forEach(it => {
    if (it.direction === Direction.Down) {
      if (result[result.length] !== it.name)
        throw new Error(
          'Invalid migration history: `down` migration must be the same migration as the last `up` migration ',
        );
      result.pop();
      return;
    }
    result.push(it.name);
  });
  return result;
};

export const getCurrentMigration = async (
  options: MigrateCommandOption,
): Promise<string | undefined> => {
  const migrationTable = config().migration.table;
  const files = getMigrationFileNames();
  const client = getDbClient();
  const query =
    `CREATE TABLE IF NOT EXISTS ${migrationTable} ` +
    '(id int auto_increment primary key , name varchar(100) not null,' +
    "direction enum('up', 'down') not null, migrated_at timestamp default current_timestamp)";
  if (!options.silent) {
    Console.log(
      `creating migration table: ${migrationTable} :: ${Buffer.from(
        migrationTable,
      ).toString('base64')}`,
    );
    Console.log(query);
  }
  await client.rawQuery(query);
  const result = await client.rawQuery(
    `SELECT name, direction
     FROM ${migrationTable}
     ORDER BY id ASC`,
  );
  if (!result.length) return;
  const runs = calcRunMigrationFileNames(
    result as unknown as MigrationRecord[],
  );
  if (runs.length === 0) return;
  runs.forEach((run, i) => {
    if (files[i] !== run)
      throw new Error(`\
Invalid migration order: Migration must be performed in the same order 
Found               : ${files[i]} 
in migration history: ${run}`);
  });
  return runs[runs.length - 1];
};
