import { config } from 'config/config';
import { createCurrentMigrationDataStore } from 'migration/exec/createCurrentMigrationDataStore';
import { getMigrationFileNames } from 'migration/exec/getMigrationFiles';
import { compileMigrationFiles } from 'migration/exec/migrationFileCompiler';

export async function getCurrentStore() {
  await compileMigrationFiles();
  const files = getMigrationFileNames();
  const targetFile =
    files.find(it => it === config().migration.target) ||
    files[files.length - 1];
  return (await createCurrentMigrationDataStore(targetFile)).serialize();
}
