import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { join } from 'path';
import { SasatConfig } from '../config/config';

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
export const writeYmlFile = (path: string, fileName: string, obj: SasatConfig): void => {
  mkDirIfNotExist(path);
  fs.writeFileSync(join(path, fileName), yaml.safeDump(obj, { skipInvalid: true }));
};
