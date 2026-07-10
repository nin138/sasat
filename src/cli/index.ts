#!/usr/bin/env node
import { cac } from "cac";
import { createMigration } from "@/cli/commands/createMigration.js";
import { dumpDB } from "@/cli/commands/dumpDb.js";
import { writeDiagram } from "@/cli/commands/erDiagram.js";
import { generate } from "@/cli/commands/generate.js";
import { generateTestMigFileCommand } from "@/cli/commands/generateTestMigFileCommand.js";
import { generateTestMigrationFile } from "@/cli/commands/generateTestMigrationFile.js";
import { init } from "@/cli/commands/init.js";
import { migrate } from "@/cli/commands/migrate.js";
import { migrationBuild } from "@/cli/commands/migrationBuild.js";
import { config, setConfig } from "@/config/config.js";
import { getDbClient } from "@/db/getDbClient.js";

const index = cac();
try {
  index
    .usage("yarn sasat <command> [options]\n")
    .command("migrate", "execute migration")
    .option("-g, --generateFiles", "migrate with generate files")
    .option("-d, --dry", "dry run")
    .option("-s, --silent", "do not print logs")
    .option("-b, --skipBuild", "skip compile migration files")
    .action(async (options) => {
      const conf = config();
      if (conf.migration.db) {
        setConfig({ db: conf.migration.db });
      }
      const client = getDbClient();
      await migrate(client, options).catch((e) => {
        console.error(e);
        process.exit(1);
      });
      if (options.generateFiles) {
        await generateTestMigrationFile(client);
      }
      await client.release();
    });
  index
    .command("migration:build", "compile migration files")
    .action(migrationBuild);
  index.command("generate", "generate files").action(generate);
  index
    .command("generate:er", "generate mermaid er diagram")
    .action(writeDiagram);
  index
    .command("migration:create [name]", "generate new migration file")
    .action(createMigration);
  index.command("dump-db", "dump database schema").action(dumpDB);
  index.command("init").action(init);
  index
    .command("generate:test", "generate migration file for testing")
    .action(async () => {
      await generateTestMigFileCommand({ silent: false });
    });

  index.parse();
  if (!index.matchedCommand) index.outputHelp();
} catch (e) {
  console.error(e);
  process.exit(1);
}
