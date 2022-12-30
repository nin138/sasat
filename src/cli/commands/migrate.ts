import { MigrationController } from '../../migration/controller.js';
import { Console } from '../console.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { writeCurrentSchema } from '../../util/fsUtil.js';
import { getDbClient } from '../../db/getDbClient.js';
import { CodeGen_v2 } from '../../generatorv2/codegen_v2.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const migrate = async (options: {
  [key: string]: boolean;
}): Promise<void> => {
  let current;
  try {
    const migration = new MigrationController();
    const result = await migration.migrate();
    current = result.currentMigration;
    if (options.generateFiles) {
      const storeHandler = new DataStoreHandler(result.store);
      writeCurrentSchema(result.store);
      await new CodeGen_v2(storeHandler).generate();
    }
  } catch (e: unknown) {
    Console.error((e as Error).message);
    throw e;
  } finally {
    await getDbClient().release();
    Console.success(`current migration is ${current}`);
  }
};
