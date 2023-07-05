import path from 'path';
import { StoreMigrator } from '../front/storeMigrator.js';
import { Direction } from './getCurrentMigration.js';
import { config } from '../../config/config.js';
import { changeExtTsToJs } from './migrationFileCompiler.js';

export const readMigration = async (
  store: StoreMigrator,
  tsFileName: string,
  direction: Direction,
): Promise<StoreMigrator> => {
  const file = path.join(
    process.cwd(),
    config().migration.dir,
    changeExtTsToJs(tsFileName),
  );
  const module = await import(file);
  const instance = new module.default();
  if (direction === Direction.Up) {
    if (instance.beforeUp) await instance.beforeUp();
    await instance.up(store);
    if (instance.afterUp) await instance.afterUp();
  } else {
    if (instance.beforeDown) await instance.beforeDown();
    await instance.down(store);
    if (instance.afterDown) await instance.afterDown();
  }
  return store;
};
