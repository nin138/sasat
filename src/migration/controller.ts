import { config } from '../config/config.js';
import { SerializedStore } from './serialized/serializedStore.js';
import { compileMigrationFiles } from './exec/migrationFileCompiler.js';
import { getCurrentMigration } from './exec/getCurrentMigration.js';
import { readMigration } from './exec/readMigrationFile.js';
import { runMigration } from './exec/runMigration.js';
import { getMigrationTargets } from './exec/getMigrationTarget.js';
import { createCurrentMigrationDataStore } from './exec/createCurrentMigrationDataStore.js';
import { MigrateCommandOption } from '../cli/commands/migrate.js';
import { Console } from '../cli/console.js';

export class MigrationController {
  async migrate(options: MigrateCommandOption): Promise<{
    store: SerializedStore;
    currentMigration: string;
  }> {
    const fileNames = await compileMigrationFiles();
    const currentMigration = await getCurrentMigration(options);
    Console.log('--current migration--: ' + currentMigration);
    let store = await createCurrentMigrationDataStore(currentMigration);
    const target = getMigrationTargets(fileNames, currentMigration);

    for (const tsFileName of target.files) {
      if (!options.silent) {
        Console.log('---------\n' + tsFileName);
      }
      store = await readMigration(store, tsFileName, target.direction);
      await runMigration(store, tsFileName, target.direction, options);
      store.resetQueue();
    }
    return {
      store: store.serialize(),
      currentMigration:
        config().migration.target || fileNames[fileNames.length - 1],
    };
  }
}
