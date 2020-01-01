#!/usr/bin/env node
import { cac } from 'cac';
import { migrate } from './commands/migrate';
import { createMigration } from './commands/createMigration';
import { init } from './commands/init';

const cli = cac();
cli
  .command('migrate', 'execute migration')
  .option('-g, --generateFiles', 'migrate with generate files')
  .action(async options => {
    await migrate(options);
  });

cli.command('migration:create [name]', 'generate new migration file').action(createMigration);

cli.command('init').action(init);

cli.parse();
if (!cli.matchedCommand) cli.outputHelp();
