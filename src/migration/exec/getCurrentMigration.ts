import {config} from '../../config/config.js';
import {getDbClient} from '../../db/getDbClient.js';
import {getMigrationFileNames} from "./getMigrationFiles.js";

export enum Direction {
  Up = 'up',
  Down = 'down',
}

export const getCurrentMigration = async (): Promise<string | undefined> => {
  const migrationTable = config().migration.table;
  const files = getMigrationFileNames();
  const client = getDbClient();
  await client.rawQuery(
    `CREATE TABLE IF NOT EXISTS ${migrationTable} ` +
    '(id int auto_increment primary key , name varchar(100) not null,' +
    "direction enum('up', 'down') not null, migrated_at timestamp default current_timestamp)",
  );
  const result = await client.rawQuery(
    `SELECT name, direction
     FROM ${migrationTable}
     ORDER BY id DESC LIMIT 1`,
  );
  if (!result.length) return;
  if (result[0].direction === Direction.Up) return result[0].name;
  const index = files.indexOf(result[0].name);
  if (index === -1) throw new Error(`${result[0].name} not found`);
  return files[index - 1];
}
