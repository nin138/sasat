import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';
import { getDbClient } from '../db/getDbClient';
import { DataStoreMigrator } from './dataStore';
import * as ts from 'typescript';
import { generate } from '../generator';

const migrationTable = '__migration__';

enum Direction {
  Up = 'up',
  Down = 'down',
}

export class MigrationController {
  private migrationDir = path.join(process.cwd(), config().migration.dir);
  private files = fs.readdirSync(this.migrationDir).filter(it => it.split('.').pop() === 'ts');

  async migrate(): Promise<string> {
    const currentMigration = await this.getCurrentMigration();
    const store = this.getCurrentDataStore(this.files, currentMigration);
    const target = this.getTargets(this.files, currentMigration);
    for (const fileName of target.files) {
      this.readMigration(store, fileName, target.direction);
      await this.execMigration(store, fileName, target.direction);
      store.reset();
    }
    await generate(store.serialize());
    return config().migration.target || this.files[this.files.length - 1];
  }

  private async getCurrentMigration(): Promise<string | undefined> {
    const client = getDbClient();
    await client.rawQuery(
      `CREATE TABLE IF NOT EXISTS ${migrationTable} ` +
        '(id int auto_increment primary key , name varchar(100) unique not null,' +
        "direction enum('up', 'down') not null, migrated_at timestamp default current_timestamp)",
    );
    const result = await client.rawQuery(`SELECT name, direction FROM ${migrationTable} ORDER BY id LIMIT 1`);
    if (!result.length) return;
    if (result[0].direction === Direction.Up) return result[0].name;
    const index = this.files.indexOf(result[0].name);
    if (index === -1) throw new Error(`${result[0].name} not found`);
    return this.files[index - 1];
  }

  private getTargets(files: string[], current: string | undefined): { direction: Direction; files: string[] } {
    const currentIndex = current ? files.indexOf(current) + 1 : 0;
    const targetIndex = files.indexOf(config().migration.target || files[files.length - 1]) + 1;
    if (currentIndex === -1 || targetIndex === -1) throw new Error('migration target not found');
    if (targetIndex >= currentIndex)
      return {
        direction: Direction.Up,
        files: files.slice(currentIndex, targetIndex),
      };
    return {
      direction: Direction.Down,
      files: files.slice(targetIndex, currentIndex).reverse(),
    };
  }
  private getCurrentDataStore(files: string[], current: string | undefined) {
    const store = new DataStoreMigrator();
    if (!current) return store;
    files = files.slice(0, files.indexOf(current) + 1);
    files.forEach(fileName => this.readMigration(store, fileName, Direction.Up));
    store.reset();
    return store;
  }

  private async execMigration(store: DataStoreMigrator, migrationName: string, direction: Direction) {
    const sqls = store.getSql();
    const transaction = await getDbClient().transaction();
    try {
      for (const sql of sqls) await transaction.rawQuery(sql);
      await transaction.query`insert into ${() => migrationTable} (name, direction) values (${[
        migrationName,
        direction,
      ]})`;
      return await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  private readMigration(store: DataStoreMigrator, fileName: string, direction: Direction) {
    const file = fs.readFileSync(path.join(this.migrationDir, fileName)).toString();
    // tslint:disable-next-line
    const Class = eval(ts.transpile(file));
    const instance = new Class();
    if (direction === Direction.Up) {
      if (instance.beforeUp) instance.beforeUp();
      instance.up(store);
      if (instance.afterUp) instance.afterUp();
    } else {
      if (!instance.down) throw new Error(`${fileName} cannot down`);
      if (instance.beforeDown) instance.beforeDown();
      instance.down(store);
      if (instance.afterDown) instance.afterDown();
    }
    return store;
  }
}
