import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';
import { getDbClient } from '..';
import * as ts from 'typescript';
import { StoreMigrator } from './storeMigrator';
import { SerializedStore } from '../entity/serializedStore';
import { Direction, MigrationTargetResolver } from './migrationTargetResolver';
import { MigrationReader } from './migrationReader';
import { Console } from '../cli/console';

// TODO refactor
export class MigrationController {
  private migrationDir = path.join(process.cwd(), config().migration.dir);
  private files = fs
    .readdirSync(this.migrationDir)
    .filter(it => it.split('.').pop() === 'ts');

  async migrate(): Promise<{
    store: SerializedStore;
    currentMigration: string;
  }> {
    const currentMigration = await new MigrationTargetResolver().getCurrentMigration();
    const store = this.getCurrentDataStore(this.files, currentMigration);
    const target = this.getTargets(this.files, currentMigration);
    for (const fileName of target.files) {
      MigrationReader.readMigration(store, fileName, target.direction);
      await this.execMigration(store, fileName, target.direction);
      store.resetQueue();
    }
    return {
      store: store.serialize(),
      currentMigration:
        config().migration.target || this.files[this.files.length - 1],
    };
  }

  private getTargets(
    files: string[],
    current: string | undefined,
  ): { direction: Direction; files: string[] } {
    const currentIndex = current ? files.indexOf(current) + 1 : 0;
    const targetIndex =
      files.indexOf(config().migration.target || files[files.length - 1]) + 1;
    if (currentIndex === -1 || targetIndex === -1)
      throw new Error('migration target not found');
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
    const store = new StoreMigrator();
    if (!current) return store;
    files = files.slice(0, files.indexOf(current) + 1);
    files.forEach(fileName =>
      MigrationReader.readMigration(store, fileName, Direction.Up),
    );
    store.resetQueue();
    return store;
  }

  private async execMigration(
    store: StoreMigrator,
    migrationName: string,
    direction: Direction,
  ) {
    const sqls = store.getSql();
    const transaction = await getDbClient().transaction();
    try {
      for (const sql of sqls) {
        await transaction.rawQuery(sql).catch((e: Error) => {
          Console.error(`ERROR ON ${migrationName}`);
          Console.error(`SQL: ${sql}`);
          Console.error(`MESSAGE: ${e.message}`);
          process.exit(1);
        });
      }
      await transaction.query`insert into ${() =>
        MigrationTargetResolver.getMigrationTable()} (name, direction) values (${[
        migrationName,
        direction,
      ]})`;
      return await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
