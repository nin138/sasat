import fs from "node:fs";
import { join } from "node:path";
import { Console } from "@/cli/console.js";
import { config } from "@/config/config.js";
import type { DBClient } from "@/db/connectors/dbClient.js";
import { MigrationController } from "@/migration/controller.js";
import { compileMigrationFiles } from "@/migration/exec/migrationFileCompiler.js";
import type { StoreMigrator } from "@/migration/front/storeMigrator.js";

export async function generateTestMigrationFile(client: DBClient) {
  try {
    await compileMigrationFiles();
    const migration = new MigrationController();
    const sqls: string[] = [];
    const exec = async (_: DBClient, store: StoreMigrator) => {
      if (!store.currentOption.skipOnTest) sqls.push(...store.getSql());
    };
    await migration.migrate(
      client,
      undefined,
      {
        generateFiles: false,
        silent: true,
        dry: false,
        skipBuild: false,
      },
      exec,
    );
    fs.writeFileSync(
      join(config().migration.dir, "test.migration.json"),
      JSON.stringify(sqls),
    );
  } catch (e: unknown) {
    Console.error((e as Error).message);
    throw e;
  }
}
