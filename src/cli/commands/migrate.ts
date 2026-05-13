import { DBClient } from '@/db/connectors/dbClient.js';
import { config, setConfig } from '@/config/config.js';
import { MigrationController } from '@/migration/controller.js';
import { Console } from '../console.js';
import { DataStoreHandler } from '@/migration/dataStore.js';
import { writeCurrentSchema } from '@/util/fsUtil.js';
import { CodeGen_v2 } from '@/generatorv2/codegen_v2.js';
import { compileMigrationFiles } from '@/migration/exec/migrationFileCompiler.js';

export type MigrateCommandOption = {
  generateFiles: boolean;
  silent: boolean;
  dry: boolean;
  skipBuild: boolean;
};

export const migrate = async (
  client: DBClient,
  options: MigrateCommandOption,
): Promise<void> => {
  let current;
  if (!options.silent) Console.log('--migration started--');
  try {
    if (!options.skipBuild) {
      await compileMigrationFiles();
    }
    const conf = config();
    if (conf.migration.db) {
      setConfig({ db: conf.migration.db });
    }
    const migration = new MigrationController();
    const result = await migration.migrate(client, options);
    current = result.currentMigration;
    if (options.generateFiles) {
      const storeHandler = new DataStoreHandler(result.store);
      writeCurrentSchema(result.store);
      await new CodeGen_v2(storeHandler).generate();
    }
    if (!options.silent) Console.success(`current migration is ${current}`);
  } catch (e: unknown) {
    Console.error((e as Error).message);
    throw e;
  }
};
