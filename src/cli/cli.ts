import { cac } from "cac";
import { createMigrationFile } from "./createMigrationFile";
import { Console } from "./console";
import { migrate } from "./commands/migrate";

const cli = cac();
cli.command("migrate", "execute migration").action(async () => {
  await migrate();
});

cli.command("migration:create [name]", "generate new migration file").action(args => {
  if (!args) {
    Console.error("missing argument migration name");
    return;
  }
  if (!/^[$A-Za-z_][0-9A-Za-z_]+$/.test(args)) {
    Console.error("migration name should be match /^[$A-Za-z_][0-9A-Za-z_]+$/");
    return;
  }
  Console.success(createMigrationFile(args) + " Successfully created");
  return;
});

cli.parse();
if (!cli.matchedCommand) cli.outputHelp();
