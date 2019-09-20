import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { join } from 'path';

export const readYmlFile = (filepath: string) => yaml.safeLoad(fs.readFileSync(filepath, 'utf8'));

export const mkDirIfNotExists = (path: string) => {
  if (!fs.pathExistsSync(path)) fs.mkdirpSync(path);
};

export const writeYmlFile = (path: string, fileName: string, obj: any) => {
  mkDirIfNotExists(path);
  fs.writeFileSync(join(path, fileName), yaml.safeDump(obj, { skipInvalid: true }));
};

export const capitalizeFirstLetter = (str: string): string => str.slice(0, 1).toUpperCase() + str.slice(1);
