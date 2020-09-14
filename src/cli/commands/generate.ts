import { Parser } from '../../parser/parser';
import { CodeGenerateController } from '../../generator/controller';
import { Console } from '../console';
import { MigrationReader } from '../../migration/migrationReader';
import { DataStoreHandler } from '../../migration/dataStore';
import { writeCurrentSchema } from '../../util/fsUtil';

export const generate = async (): Promise<void> => {
  try {
    const store = new MigrationReader().read().serialize();
    const storeHandler = new DataStoreHandler(store);
    writeCurrentSchema(store);
    const ir = new Parser().parse(storeHandler);
    await new CodeGenerateController(ir).generate();
  } catch (e) {
    Console.error(e.message);
    throw e;
  }
};
