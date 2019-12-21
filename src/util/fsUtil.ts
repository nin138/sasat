import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { join } from 'path';

export const readYmlFile = (filepath: string) => yaml.safeLoad(fs.readFileSync(filepath, 'utf8'));

export const mkDirIfNotExists = (path: string) => {
  if (!fs.pathExistsSync(path)) fs.mkdirpSync(path);
};

export const writeFileIfNotExists = (path: string, data: string): Promise<void> => {
  if (fs.existsSync(path)) return Promise.resolve();
  return fs.writeFile(path, data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const writeYmlFile = (path: string, fileName: string, obj: any) => {
  mkDirIfNotExists(path);
  fs.writeFileSync(join(path, fileName), yaml.safeDump(obj, { skipInvalid: true }));
};
