import { DataStoreHandler } from '../../entity/dataStore';
import { Parser } from '../../parser/parser';
import { GqlParser } from '../../parser/gqlParser';
import { CodeGenerateController } from '../../generator/controller';
import { Console } from '../console';
import { MigrationReader } from '../../migration/migrationReader';

export const generate = async () => {
  try {
    const store = new MigrationReader().read();
    const storeHandler = new DataStoreHandler(store.serialize());
    const ir = new Parser(storeHandler).parse();
    const gql = new GqlParser(storeHandler).parse();
    await new CodeGenerateController(ir, gql).generate();
  } catch (e) {
    Console.error(e.message);
    throw e;
  }
};
