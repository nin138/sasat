import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { join } from 'path';
import * as pluralize from 'pluralize';

export const readYmlFile = (filepath: string) => yaml.safeLoad(fs.readFileSync(filepath, 'utf8'));

export const mkDirIfNotExists = (path: string) => {
  if (!fs.pathExistsSync(path)) fs.mkdirpSync(path);
};

export const writeFileIfNotExists = (path: string, data: string) => {
  if (fs.existsSync(path)) return;
  return fs.writeFile(path, data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const writeYmlFile = (path: string, fileName: string, obj: any) => {
  mkDirIfNotExists(path);
  fs.writeFileSync(join(path, fileName), yaml.safeDump(obj, { skipInvalid: true }));
};

export const capitalizeFirstLetter = (str: string): string => str.slice(0, 1).toUpperCase() + str.slice(1);

export const camelize = (str: string): string =>
  str
    .replace(/(?:^\w|[A-Z]|_\w|\b\w)/g, (word, index) => (index == 0 ? word.toLowerCase() : word.toUpperCase()))
    .replace(/\s|_|-+/g, '');

export const plural = (str: string): string => pluralize(str);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const arrayEq = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

export const uniqueDeep = <T>(arr: T[]): T[] =>
  [...new Set(arr.map(it => JSON.stringify(it)))].map(it => JSON.parse(it));
