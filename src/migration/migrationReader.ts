import { StoreMigrator } from './front/storeMigrator.js';
import { Direction, MigrationTargetResolver } from './migrationTargetResolver.js';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { readInitialSchema } from '../util/fsUtil.js';

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

  static readMigration(store: StoreMigrator, fileName: string, direction: Direction): StoreMigrator {
    const file = fs.readFileSync(path.join(MigrationTargetResolver.getMigrationDir(), fileName)).toString();
    // tslint:disable-next-line
    const Class = eval(ts.transpile(file));
    const instance = new Class();
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
