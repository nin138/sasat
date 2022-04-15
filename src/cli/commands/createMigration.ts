import * as fs from 'fs';
import { join } from 'path';
import { config } from '../../config/config.js';
import { capitalizeFirstLetter } from '../../util/stringUtil.js';
import { mkDirIfNotExist } from '../../util/fsUtil.js';
import { Console } from '../console.js';

const getMigrationFile = (className: string) =>
  `import { SasatMigration } from "sasat";
import { MigrationStore } from "sasat";

export class ${capitalizeFirstLetter(className)} implements SasatMigration {
  
  up: (store: MigrationStore) => void = store => {

  };
  
  down: (store: MigrationStore) => void = store => {
    throw new Error('Down is not implemented on ${className}');
  };
}

`;

export const createMigrationFile = (migrationName: string): string => {
  const date = new Date();
  const pad = (val: number) => val.toString().padStart(2, '0');
  const now =
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    `_` +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds());
  const fileName = now + migrationName;
  const outDir = join(config().migration.dir);
  mkDirIfNotExist(outDir);
  fs.writeFileSync(join(outDir, fileName) + '.ts', getMigrationFile(migrationName));
  return fileName;
};

export const createMigration = (args: string): void => {
  if (!args) {
    Console.error('missing argument migration name');
    return;
  }
  if (!/^[$A-Za-z_][0-9A-Za-z_]+$/.test(args)) {
    Console.error('migration name should be match /^[$A-Za-z_][0-9A-Za-z_]+$/');
    return;
  }
  Console.success(createMigrationFile(args) + ' Successfully created');
  return;
};
