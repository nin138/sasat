import { DBClient } from '@/db/connectors/dbClient.js';
import { config, setConfig } from '../config/config.js';
import { SerializedStore } from './serialized/serializedStore.js';
import { getCurrentMigration } from './exec/getCurrentMigration.js';
import { readMigration } from './exec/readMigrationFile.js';
import { runMigration } from './exec/runMigration.js';
import { getMigrationTargets } from './exec/getMigrationTarget.js';
import { createCurrentMigrationDataStore } from './exec/createCurrentMigrationDataStore.js';
import { MigrateCommandOption } from '../cli/commands/migrate.js';
import { Console } from '../cli/console.js';
import { getMigrationFileNames } from '../migration/exec/getMigrationFiles.js';

export class MigrationController {
  async migrate(
    client: DBClient,
    options: MigrateCommandOption,
  ): Promise<{
    store: SerializedStore;
    currentMigration: string;
  }> {
    const fileNames = getMigrationFileNames();
    const currentMigration = await getCurrentMigration(options);
    Console.log('--current migration--: ' + currentMigration);
    let store = await createCurrentMigrationDataStore(currentMigration);
    if (store.getUpdateConfig()) {
      setConfig(store.getUpdateConfig()!);
    }
    const target = getMigrationTargets(fileNames, currentMigration);

    for (const tsFileName of target.files) {
      if (!options.silent) {
        Console.log('---------\n' + tsFileName);
      }
      store = await readMigration(store, tsFileName, target.direction);
      await runMigration(client, store, tsFileName, target.direction, options);
      store.resetQueue();
    }
    return {
      store: store.serialize(),
      currentMigration:
        config().migration.target || fileNames[fileNames.length - 1],
    };
  }
}
