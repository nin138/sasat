import yaml from 'js-yaml';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config/config.js';
import { SerializedStore } from '../migration/serialized/serializedStore.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readYmlFile = (filepath: string): any =>
  yaml.load(readFileSync(filepath, 'utf8'));

export const mkDirIfNotExist = (path: string): void => {
  if (!existsSync(path)) mkdirSync(path);
};

export const writeFileIfNotExist = (
  path: string,
  data: string,
): Promise<void> => {
  if (existsSync(path)) return Promise.resolve();
  return writeFile(path, data);
};

export const writeYmlFile = (
  path: string,
  fileName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
): void => {
  mkDirIfNotExist(path);
  writeFileSync(
    join(path, fileName),
    yaml.dump(obj, {
      skipInvalid: true,
      noRefs: true,
      sortKeys: (a, b) => {
        if (b === 'tableName') return 1;
        if (a === 'tableName') return -1;

        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
      },
    }),
  );
};

export const readInitialSchema = (): SerializedStore => {
  return readYmlFile(join(config().migration.dir, 'initialSchema.yml'));
};
export const writeCurrentSchema = (schema: SerializedStore): void => {
  writeYmlFile(config().migration.dir, 'currentSchema.yml', schema as never);
};
