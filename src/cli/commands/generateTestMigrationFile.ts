import { join } from "node:path";
import { Console } from "@/cli/console.js";
import { getMigrationDirectory } from "@/config/config.js";
import type { DBClient } from "@/db/connectors/dbClient.js";
import { publishArtifacts } from "@/generatorv2/fs/publishArtifacts.js";
import { compileMigrationFiles } from "@/migration/exec/migrationFileCompiler.js";
import { StoreMigrator } from "@/migration/front/storeMigrator.js";
import { SqlGenerator, sqlFor } from "../../db/sqlGenerator.js";
import { getMigrationFileNames } from "../../migration/exec/getMigrationFiles.js";
import { getMigrationTargets } from "../../migration/exec/getMigrationTarget.js";
import { readMigration } from "../../migration/exec/readMigrationFile.js";

export async function renderTestMigrationFile(
  client: DBClient | SqlGenerator,
  skipBuild = false,
): Promise<string> {
  try {
    if (!skipBuild) await compileMigrationFiles();
    const sql = client instanceof SqlGenerator ? client : sqlFor(client);
    const target = getMigrationTargets(getMigrationFileNames(), undefined);
    let store = StoreMigrator.new(sql);
    const sqls: string[] = [];
    for (const name of target.files) {
      store = await readMigration(store, name, target.direction);
      if (!store.currentOption.skipOnTest) sqls.push(...store.getSql());
      store.resetQueue();
    }
    return JSON.stringify(sqls);
  } catch (e: unknown) {
    Console.error((e as Error).message);
    throw e;
  }
}

export async function generateTestMigrationFile(
  client: DBClient | SqlGenerator,
) {
  const content = await renderTestMigrationFile(client);
  publishArtifacts([
    { path: join(getMigrationDirectory(), "test.migration.json"), content },
  ]);
}
