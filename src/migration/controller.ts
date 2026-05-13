import type { DBClient } from '@/db/connectors/dbClient.js';
import type { MigrateCommandOption } from '../cli/commands/migrate.js';
import { Console } from '../cli/console.js';
import { config, setConfig } from '../config/config.js';
import { getMigrationFileNames } from '../migration/exec/getMigrationFiles.js';
import { createCurrentMigrationDataStore } from './exec/createCurrentMigrationDataStore.js';
import { getCurrentMigration } from './exec/getCurrentMigration.js';
import { getMigrationTargets } from './exec/getMigrationTarget.js';
import { readMigration } from './exec/readMigrationFile.js';
import { runMigration } from './exec/runMigration.js';
import type { SerializedStore } from './serialized/serializedStore.js';

export class MigrationController {
  async migrate(
    client: DBClient,
    options: MigrateCommandOption,
  ): Promise<{
    store: SerializedStore;
    currentMigration: string;
  }> {
    const fileNames = getMigrationFileNames();
    console.log(4, options);
    const currentMigration = await getCurrentMigration(options);
    if (!options.silent) {
      Console.log('--current migration--: ' + currentMigration);
    }
    console.log(2);
    let store = await createCurrentMigrationDataStore(currentMigration);
    if (store.getUpdateConfig()) {
      setConfig(store.getUpdateConfig()!);
    }
    console.log(1);
    const target = getMigrationTargets(fileNames, currentMigration);
    console.log(2);
    for (const tsFileName of target.files) {
      if (!options.silent) {
        Console.log('---------\n' + tsFileName);
      }
      console.log(3, tsFileName);
      store = await readMigration(store, tsFileName, target.direction);
      console.log(4);
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
