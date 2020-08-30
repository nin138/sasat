import { DataStoreHandler } from '../../entity/dataStore';
import { Parser } from '../../parser/parser';
import { CodeGenerateController } from '../../generator/controller';
import { Console } from '../console';
import { MigrationReader } from '../../migration/migrationReader';

export const generate = async () => {
  try {
    const store = new MigrationReader().read();
    const storeHandler = new DataStoreHandler(store.serialize());
    const ir = new Parser().parse(storeHandler);
    await new CodeGenerateController(ir).generate();
  } catch (e) {
    Console.error(e.message);
    throw e;
  }
};
