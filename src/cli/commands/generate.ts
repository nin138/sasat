import { Parser } from '../../parser/parser.js';
import { CodeGenerateController } from '../../generator/controller.js';
import { Console } from '../console.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { writeCurrentSchema } from '../../util/fsUtil.js';
import { createCurrentMigrationDataStore } from '../../migration/exec/createCurrentMigrationDataStore.js';
import { compileMigrationFiles } from '../../migration/exec/migrationFileCompiler.js';
import { config } from '../../config/config.js';
import { getMigrationFileNames } from '../../migration/exec/getMigrationFiles.js';

export const generate = async (): Promise<void> => {
  try {
    await compileMigrationFiles();
    const files = getMigrationFileNames();
    const targetFile =
      files.find(it => it === config().migration.target) ||
      files[files.length - 1];
    const store = (
      await createCurrentMigrationDataStore(targetFile)
    ).serialize();
    const storeHandler = new DataStoreHandler(store);
    writeCurrentSchema(store);
    const ir = new Parser().parse(storeHandler);
    await new CodeGenerateController(ir).generate();
    Console.success(
      `code generated. DIR: ${
        config().migration.out
      }\nmigration target: ${targetFile}`,
    );
  } catch (e) {
    Console.error((e as Error).message);
    throw e;
  }
};
