import { StoreMigrator } from '../front/storeMigrator.js';
import { readMigration } from './readMigrationFile.js';
import { Direction } from './getCurrentMigration.js';
import { getMigrationFileNames } from './getMigrationFiles.js';

export const createCurrentMigrationDataStore = async (
  targetMigrationName: string | undefined,
): Promise<StoreMigrator> => {
  const allFiles = getMigrationFileNames();
  let store = StoreMigrator.new();
  if (!targetMigrationName) return store;
  const files = allFiles.slice(0, allFiles.indexOf(targetMigrationName) + 1);
  for (const tsFileName of files) {
    store = await readMigration(store, tsFileName, Direction.Up);
  }
  store.resetQueue();
  return store;
};
