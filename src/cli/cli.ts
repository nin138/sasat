#!/usr/bin/env node
import { cac } from 'cac';
import { createMigration } from './commands/createMigration.js';
import { migrate } from './commands/migrate.js';
import { init } from './commands/init.js';
import { generate } from './commands/generate.js';
import { dumpDB } from './commands/dumpDb.js';

const cli = cac();
try {
  cli
    .usage('yarn sasat <command> [options]\n')
    .command('migrate', 'execute migration')
    .option('-g, --generateFiles', 'migrate with generate files')
    .action(async options => {
      await migrate(options).catch(() => {
        process.exit(1);
      });
    });
  cli.command('generate', 'generate files').action(generate);
  cli
    .command('migration:create [name]', 'generate new migration file')
    .action(createMigration);
  cli.command('dump-db', 'dump database schema').action(dumpDB);
  cli.command('init').action(init);

  cli.parse();
  if (!cli.matchedCommand) cli.outputHelp();
} catch (e) {
  console.error(e);
  process.exit(1);
}
