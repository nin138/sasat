import { MigrationController } from '../../migration/controller.js';
import { Console } from '../console.js';
import { Parser } from '../../parser/parser.js';
import { CodeGenerateController } from '../../generator/controller.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { writeCurrentSchema } from '../../util/fsUtil.js';
import {getDbClient} from "../../db/getDbClient.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const migrate = async (options: { [key: string]: boolean }): Promise<void> => {
  let current;
  try {
    const migration = new MigrationController();
    const result = await migration.migrate();
    current = result.currentMigration;
    if (options.generateFiles) {
      const storeHandler = new DataStoreHandler(result.store);
      writeCurrentSchema(result.store);
      const ir = new Parser().parse(storeHandler);
      await new CodeGenerateController(ir).generate();
    }
  } catch (e: any) {
    Console.error(e.message);
    throw e;
  } finally {
    await getDbClient().release();
  }
  Console.success(`current migration is ${current}`);
};
