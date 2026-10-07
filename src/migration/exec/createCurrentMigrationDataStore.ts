import {
  createSqlGenerator,
  type SqlGenerator,
} from "../../db/sqlGenerator.js";
import { StoreMigrator } from "../front/storeMigrator.js";
import { Direction } from "./getCurrentMigration.js";
import { getMigrationFileNames } from "./getMigrationFiles.js";
import { resolveMigrationTarget } from "./getMigrationTarget.js";
import { readMigration } from "./readMigrationFile.js";

export const createCurrentMigrationDataStore = async (
  targetMigrationName: string | undefined,
  sqlGenerator: SqlGenerator = createSqlGenerator(),
): Promise<StoreMigrator> => {
  const allFiles = getMigrationFileNames();
  if (targetMigrationName !== undefined)
    resolveMigrationTarget(allFiles, targetMigrationName);
  let store = StoreMigrator.new(sqlGenerator);
  if (!targetMigrationName) return store;
  const files = allFiles.slice(0, allFiles.indexOf(targetMigrationName) + 1);
  for (const tsFileName of files) {
    store = await readMigration(store, tsFileName, Direction.Up);
  }
  store.resetQueue();
  return store;
};
