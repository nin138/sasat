import { config } from "../../config/config.js";
import { createCurrentMigrationDataStore } from "../../migration/exec/createCurrentMigrationDataStore.js";
import { getMigrationFileNames } from "../../migration/exec/getMigrationFiles.js";
import { compileMigrationFiles } from "../../migration/exec/migrationFileCompiler.js";

export async function getCurrentStore() {
  await compileMigrationFiles();
  const files = getMigrationFileNames();
  const targetFile =
    files.find((it) => it === config().migration.target) ||
    files[files.length - 1];
  return (await createCurrentMigrationDataStore(targetFile)).serialize();
}
