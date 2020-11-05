import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { join } from 'path';
import { config } from '../config/config';
import { SerializedStore } from '../migration/serialized/serializedStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readYmlFile = (filepath: string): any => yaml.safeLoad(fs.readFileSync(filepath, 'utf8'));

export const mkDirIfNotExist = (path: string): void => {
  if (!fs.pathExistsSync(path)) fs.mkdirpSync(path);
};

export const writeFileIfNotExist = (path: string, data: string): Promise<void> => {
  if (fs.existsSync(path)) return Promise.resolve();
  return fs.writeFile(path, data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const writeYmlFile = (path: string, fileName: string, obj: Record<string, any>): void => {
  mkDirIfNotExist(path);
  fs.writeFileSync(
    join(path, fileName),
    yaml.safeDump(obj, {
      skipInvalid: true,
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
  writeYmlFile(config().migration.dir, 'currentSchema.yml', schema);
};
