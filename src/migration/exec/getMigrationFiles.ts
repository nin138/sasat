import path from 'path';
import { config } from '../../config/config.js';
import fs from 'fs';

export const getMigrationFileDir = () => {
  return path.join(process.cwd(), config().migration.dir);
};

export const getMigrationFileNames = (): string[] => {
  return fs
    .readdirSync(getMigrationFileDir())
    .filter(it => it.split('.').pop() === 'ts');
};
