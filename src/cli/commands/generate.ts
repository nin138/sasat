import { join } from "node:path";
import { renderTestMigrationFile } from "@/cli/commands/generateTestMigrationFile.js";
import { getCurrentStore } from "@/cli/commands/getCurrentStore.js";
import { config, setConfig } from "@/config/config.js";
import { getDbClient } from "@/db/getDbClient.js";
import { CodeGen_v2 } from "@/generatorv2/codegen_v2.js";
import { DataStoreHandler } from "@/migration/dataStore.js";
import { getMigrationFileNames } from "@/migration/exec/getMigrationFiles.js";
import { serializeYml } from "@/util/fsUtil.js";
import { Console } from "../console.js";

export const generate = async (): Promise<void> => {
  try {
    if (config().migration.db) setConfig({ db: config().migration.db });
    const store = await getCurrentStore();
    const files = getMigrationFileNames();
    const targetFile = config().migration.target ?? files[files.length - 1];
    const storeHandler = new DataStoreHandler(store);
    const client = getDbClient();
    let testSql: string;
    try {
      // getCurrentStore already compiled this set of definitions.
      testSql = await renderTestMigrationFile(client, true);
    } finally {
      await client.release();
    }
    await new CodeGen_v2(storeHandler).generate([
      {
        path: join(config().migration.dir, "currentSchema.yml"),
        content: serializeYml(store),
      },
      {
        path: join(config().migration.dir, "test.migration.json"),
        content: testSql,
      },
    ]);
    Console.success(
      `code generated. DIR: ${
        config().migration.out
      }\nmigration target: ${targetFile}`,
    );
  } catch (e) {
    Console.error((e as Error).message);
    throw e;
  }
};
