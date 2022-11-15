import { Parser } from '../../parser/parser.js';
import { CodeGenerateController } from '../../generator/controller.js';
import { Console } from '../console.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { writeCurrentSchema } from '../../util/fsUtil.js';
import {getCurrentMigration} from "../../migration/exec/getCurrentMigration.js";
import {createCurrentMigrationDataStore} from "../../migration/exec/createCurrentMigrationDataStore.js";
import {compileMigrationFiles} from "../../migration/exec/migrationFileCompiler.js";

export const generate = async (): Promise<void> => {
  try {
    await compileMigrationFiles();
    const store = (await createCurrentMigrationDataStore(await getCurrentMigration())).serialize();
    const storeHandler = new DataStoreHandler(store);
    writeCurrentSchema(store);
    const ir = new Parser().parse(storeHandler);
    await new CodeGenerateController(ir).generate();
  } catch (e) {
    Console.error((e as Error).message);
    throw e;
  }
};
