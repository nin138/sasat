import type { DBClient } from "@/db/connectors/dbClient.js";
import type { StoreMigrator } from "@/migration/front/storeMigrator.js";
import type { MigrateCommandOption } from "../cli/commands/migrate.js";
import { Console } from "../cli/console.js";
import { config, setConfig } from "../config/config.js";
import { getMigrationFileNames } from "../migration/exec/getMigrationFiles.js";
import { createCurrentMigrationDataStore } from "./exec/createCurrentMigrationDataStore.js";
import type { Direction } from "./exec/getCurrentMigration.js";
import { getMigrationTargets } from "./exec/getMigrationTarget.js";
import { readMigration } from "./exec/readMigrationFile.js";
import { runMigration } from "./exec/runMigration.js";
import type { SerializedStore } from "./serialized/serializedStore.js";

export class MigrationController {
  async migrate(
    client: DBClient,
    currentMigration: string | undefined,
    options: MigrateCommandOption,
    execute: (
      client: DBClient,
      store: StoreMigrator,
      migrationName: string,
      direction: Direction,
      options: MigrateCommandOption,
    ) => Promise<void> = runMigration,
  ): Promise<{
    store: SerializedStore;
    currentMigration: string;
  }> {
    const fileNames = getMigrationFileNames();
    if (!options.silent) {
      Console.log("--current migration--: " + currentMigration);
    }
    let store = await createCurrentMigrationDataStore(currentMigration);
    if (store.getUpdateConfig()) {
      setConfig(store.getUpdateConfig()!);
    }
    const target = getMigrationTargets(fileNames, currentMigration);
    for (const tsFileName of target.files) {
      if (!options.silent) {
        Console.log("---------\n" + tsFileName);
      }
      store = await readMigration(store, tsFileName, target.direction);
      await execute(client, store, tsFileName, target.direction, options);
      store.resetQueue();
    }
    return {
      store: store.serialize(),
      currentMigration:
        config().migration.target || fileNames[fileNames.length - 1],
    };
  }
}
