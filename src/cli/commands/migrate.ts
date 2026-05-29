import { config, setConfig } from "@/config/config.js";
import type { DBClient } from "@/db/connectors/dbClient.js";
import { CodeGen_v2 } from "@/generatorv2/codegen_v2.js";
import { MigrationController } from "@/migration/controller.js";
import { DataStoreHandler } from "@/migration/dataStore.js";
import { compileMigrationFiles } from "@/migration/exec/migrationFileCompiler.js";
import { writeCurrentSchema } from "@/util/fsUtil.js";
import { Console } from "../console.js";

export type MigrateCommandOption = {
  generateFiles: boolean;
  silent: boolean;
  dry: boolean;
  skipBuild: boolean;
};

export const migrate = async (
  client: DBClient,
  options: MigrateCommandOption,
): Promise<void> => {
  let current: string | undefined;
  if (!options.silent) Console.log("--migration started--");
  try {
    if (!options.skipBuild) {
      await compileMigrationFiles();
    }
    const migration = new MigrationController();
    const result = await migration.migrate(client, options);
    current = result.currentMigration;
    if (options.generateFiles) {
      const storeHandler = new DataStoreHandler(result.store);
      writeCurrentSchema(result.store);
      await new CodeGen_v2(storeHandler).generate();
    }
    if (!options.silent) Console.success(`current migration is ${current}`);
  } catch (e: unknown) {
    Console.error((e as Error).message);
    throw e;
  }
};
