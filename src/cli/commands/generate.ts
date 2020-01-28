import { DataStoreHandler } from '../../entity/dataStore';
import { Compiler } from '../../compiler/compiler';
import { GqlCompiler } from '../../compiler/gqlCompiler';
import { CodeGenerateController } from '../../generator/controller';
import { Console } from '../console';
import { MigrationReader } from '../../migration/migrationReader';

export const generate = async () => {
  try {
    const store = new MigrationReader().read();
    const storeHandler = new DataStoreHandler(store.serialize());
    const ir = new Compiler(storeHandler).compile();
    const gql = new GqlCompiler(storeHandler).compile();
    await new CodeGenerateController(ir, gql).generate();
  } catch (e) {
    Console.error(e.message);
    throw e;
  }
};
