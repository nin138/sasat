import { Parser } from '../../parser/parser.js';
import { CodeGenerateController } from '../../generator/controller.js';
import { Console } from '../console.js';
import { MigrationReader } from '../../migration/migrationReader.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { writeCurrentSchema } from '../../util/fsUtil.js';

export const generate = async (): Promise<void> => {
  try {
    const store = new MigrationReader().read().serialize();
    const storeHandler = new DataStoreHandler(store);
    writeCurrentSchema(store);
    const ir = new Parser().parse(storeHandler);
    await new CodeGenerateController(ir).generate();
  } catch (e) {
    Console.error((e as Error).message);
    throw e;
  }
};
