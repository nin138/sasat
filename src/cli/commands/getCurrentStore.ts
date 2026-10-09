import { getConfiguredDialect } from "../../config/config.js";
import { createSqlGenerator } from "../../db/sqlGenerator.js";
import { createCurrentMigrationDataStore } from "../../migration/exec/createCurrentMigrationDataStore.js";
import { getMigrationFileNames } from "../../migration/exec/getMigrationFiles.js";
import { resolveMigrationTarget } from "../../migration/exec/getMigrationTarget.js";
import { compileMigrationFiles } from "../../migration/exec/migrationFileCompiler.js";

export async function getCurrentStore() {
  const sql = createSqlGenerator(getConfiguredDialect(true));
  const files = getMigrationFileNames();
  const targetFile = resolveMigrationTarget(files);
  await compileMigrationFiles();
  return (await createCurrentMigrationDataStore(targetFile, sql)).serialize();
}
