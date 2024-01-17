import { MigrationController } from '../../migration/controller.js';
import { Console } from '../console.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { writeCurrentSchema } from '../../util/fsUtil.js';
import { getDbClient } from '../../db/getDbClient.js';
import { CodeGen_v2 } from '../../generatorv2/codegen_v2.js';

export type MigrateCommandOption = {
  generateFiles: boolean;
  silent: boolean;
  dry: boolean;
};

export const migrate = async (options: MigrateCommandOption): Promise<void> => {
  let current;
  Console.log('--migration started--');
  try {
    const migration = new MigrationController();
    const result = await migration.migrate(options);
    current = result.currentMigration;
    if (options.generateFiles) {
      const storeHandler = new DataStoreHandler(result.store);
      writeCurrentSchema(result.store);
      await new CodeGen_v2(storeHandler).generate();
    }
    Console.success(`current migration is ${current}`);
  } catch (e: unknown) {
    Console.error((e as Error).message);
    throw e;
  } finally {
    await getDbClient().release();
  }
};
