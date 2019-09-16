import { cac } from "cac";
import { createMigrationFile } from "./createMigrationFile";
import { MigrationController } from "../migration/controller";
import { Console } from "./console";
import { getDbClient } from "../db/getDbClient";

const cli = cac();
cli.command("migrate", "execute migration").action(async _ => {
  const migration = new MigrationController();
  const current = await migration.migrate();
  Console.success(`current migration is ${current}`);
  await getDbClient().release();
});

cli.command("migration:create [name]", "generate new migration file").action(args => {
  if (!args) Console.error("missing argument migration name");
  if (!/^[$A-Za-z_][0-9A-Za-z_]+$/.test(args)) {
    Console.error("migration name should be match /^[$A-Za-z_][0-9A-Za-z_]+$/");
    return;
  }
  createMigrationFile(args);
});

cli.parse();
if (!cli.matchedCommand) cli.outputHelp();
