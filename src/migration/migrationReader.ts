import { StoreMigrator } from './front/storeMigrator.js';
import {
  Direction,
  MigrationTargetResolver,
} from './migrationTargetResolver.js';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { readInitialSchema } from '../util/fsUtil.js';
import { config } from '../config/config.js';

export class MigrationReader {
  read(onMigrate?: (store: StoreMigrator) => void): StoreMigrator {
    const files = fs.readdirSync(MigrationTargetResolver.getMigrationDir());
    const tsFiles = files.filter(it => it.split('.').pop() === 'ts');
    let store = new StoreMigrator();
    if (files.includes('initialSchema.yml')) {
      store = StoreMigrator.deserialize(readInitialSchema());
    }
    tsFiles.forEach(fileName => {
      store = MigrationReader.readMigration(store, fileName, Direction.Up);
      if (onMigrate) onMigrate(store);
    });
    return store;
  }

  private static getTsConfig() {
    const configFileName = ts.findConfigFile(
      './',
      ts.sys.fileExists,
      'tsconfig.json',
    );
    if (!configFileName) return undefined;
    const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    return ts.parseJsonConfigFileContent(configFile.config, ts.sys, './')
      .options;
  }

  static readMigration(
    store: StoreMigrator,
    fileName: string,
    direction: Direction,
  ): StoreMigrator {
    const file = fs
      .readFileSync(
        path.join(MigrationTargetResolver.getMigrationDir(), fileName),
      )
      .toString();
    let src = ts.transpile(file, this.getTsConfig()).trim();
    const filePath = `./${config().migration.dir}/${fileName}`;
    if (src.endsWith('export {};')) {
      src = src.slice(0, -10);
    }

    const instance = eval(src);
    if (direction === Direction.Up) {
      if (instance.beforeUp) instance.beforeUp();
      instance.up(store);
      if (instance.afterUp) instance.afterUp();
    } else {
      if (instance.beforeDown) instance.beforeDown();
      instance.down(store);
      if (instance.afterDown) instance.afterDown();
    }
    return store;
  }
}
