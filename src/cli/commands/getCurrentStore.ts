import { config, setConfig } from "../../config/config.js";
import { createCurrentMigrationDataStore } from "../../migration/exec/createCurrentMigrationDataStore.js";
import { getMigrationFileNames } from "../../migration/exec/getMigrationFiles.js";
import { resolveMigrationTarget } from "../../migration/exec/getMigrationTarget.js";
import { compileMigrationFiles } from "../../migration/exec/migrationFileCompiler.js";

export async function getCurrentStore() {
  if (config().migration.db) setConfig({ db: config().migration.db });
  const files = getMigrationFileNames();
  const targetFile = resolveMigrationTarget(files);
  await compileMigrationFiles();
  return (await createCurrentMigrationDataStore(targetFile)).serialize();
}
