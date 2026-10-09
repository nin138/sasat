import { join } from "node:path";
import { renderTestMigrationFile } from "@/cli/commands/generateTestMigrationFile.js";
import { getCurrentStore } from "@/cli/commands/getCurrentStore.js";
import {
  getConfiguredDialect,
  getMigrationBuildConfig,
  getMigrationOutputDir,
} from "@/config/config.js";
import { CodeGen_v2 } from "@/generatorv2/codegen_v2.js";
import { DataStoreHandler } from "@/migration/dataStore.js";
import { getMigrationFileNames } from "@/migration/exec/getMigrationFiles.js";
import { serializeYml } from "@/util/fsUtil.js";
import { createSqlGenerator } from "../../db/sqlGenerator.js";
import { Console } from "../console.js";

export const generate = async (): Promise<void> => {
  try {
    const settings = getMigrationBuildConfig();
    const out = getMigrationOutputDir();
    const sql = createSqlGenerator(getConfiguredDialect(true));
    const store = await getCurrentStore();
    const files = getMigrationFileNames();
    const targetFile = settings.target ?? files[files.length - 1];
    const storeHandler = new DataStoreHandler(store, sql);
    // getCurrentStore already compiled this set of definitions.
    const testSql = await renderTestMigrationFile(sql, true);
    await new CodeGen_v2(storeHandler).generate([
      {
        path: join(settings.dir, "currentSchema.yml"),
        content: serializeYml(store),
      },
      {
        path: join(settings.dir, "test.migration.json"),
        content: testSql,
      },
    ]);
    Console.success(
      `code generated. DIR: ${out}\nmigration target: ${targetFile}`,
    );
  } catch (e) {
    Console.error((e as Error).message);
    throw e;
  }
};
