#!/usr/bin/env node
import { cac } from "cac";
import { createMigration } from "@/cli/commands/createMigration.js";
import { dumpDB } from "@/cli/commands/dumpDb.js";
import { writeDiagram } from "@/cli/commands/erDiagram.js";
import { generate } from "@/cli/commands/generate.js";
import { generateTestMigFileCommand } from "@/cli/commands/generateTestMigFileCommand.js";
import { init } from "@/cli/commands/init.js";
import { migrate } from "@/cli/commands/migrate.js";
import { migrationBuild } from "@/cli/commands/migrationBuild.js";
import { config, setConfig } from "@/config/config.js";
import { getMigrationDbClient } from "@/migration/exec/getMigrationDbClient.js";
import { getMigrationFileNames } from "@/migration/exec/getMigrationFiles.js";
import { resolveMigrationTarget } from "@/migration/exec/getMigrationTarget.js";

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
      try {
        const conf = config();
        if (conf.migration.db) {
          setConfig({ db: conf.migration.db });
        }
        resolveMigrationTarget(getMigrationFileNames());
        const client = await getMigrationDbClient();
        try {
          await migrate(client, options);
        } finally {
          await client.release();
        }
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    });
  index
    .command("migration:build", "compile migration files")
    .option(
      "--standalone",
      "bundle migrations and the selected driver into one executable CJS file",
    )
    .option("--out <file>", "standalone output path (default: migration.cjs)")
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
