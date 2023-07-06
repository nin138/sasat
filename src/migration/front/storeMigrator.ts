import { MigrationTable, TableMigrator } from './tableMigrator.js';
import { DataStore } from '../dataStore.js';
import { TableBuilder, TableCreator } from '../creators/tableCreator.js';
import { SasatError } from '../../error.js';
import { SerializedStore } from '../serialized/serializedStore.js';
import fs from 'fs';
import path from 'path';
import { readInitialSchema } from '../../util/fsUtil.js';
import { config } from '../../config/config.js';

export interface MigrationStore extends DataStore {
  createTable(
    tableName: string,
    tableCreator: (table: TableBuilder) => void,
  ): MigrationStore;
  dropTable(tableName: string): MigrationStore;
  table(tableName: string): MigrationTable;
  sql(...sql: string[]): MigrationStore;
}

export class StoreMigrator implements MigrationStore {
  protected tables: TableMigrator[] = [];
  protected migrationQueue: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static new(): StoreMigrator {
    if (fs.existsSync(path.join(config().migration.dir, 'initialSchema.yml'))) {
      return StoreMigrator.deserialize(readInitialSchema());
    }
    return new StoreMigrator();
  }

  static deserialize(data: SerializedStore): StoreMigrator {
    const store = new StoreMigrator();
    store.tables = data.tables.map(it => TableMigrator.deserialize(it, store));
    store.resetQueue();
    return store;
  }

  table(tableName: string): TableMigrator {
    const table = this.tables.find(it => it.tableName === tableName);
    if (!table) throw new Error('QueryTable: ' + tableName + ' Not Found');
    return table;
  }

  addQuery(...query: string[]): void {
    this.migrationQueue.push(...query);
  }

  createTable(
    tableName: string,
    tableCreator: (table: TableBuilder) => void,
  ): MigrationStore {
    if (this.tables.find(it => it.tableName === tableName))
      throw new SasatError(`${tableName} is already exist`);
    const creator = new TableCreator(tableName, this);
    tableCreator(creator);
    const table = new TableMigrator(creator.create(), this);
    this.tables.push(table);
    this.addQuery(table.showCreateTable());
    this.addQuery(...table.getIndexes().map(it => it.addSql()));
    return this;
  }

  dropTable(tableName: string): MigrationStore {
    this.addQuery(`DROP TABLE ${tableName}`);
    this.tables = this.tables.filter(it => it.tableName !== tableName);
    return this;
  }

  sql(...sql: string[]): MigrationStore {
    this.addQuery(...sql);
    return this;
  }

  getSql(): string[] {
    return this.migrationQueue;
  }

  resetQueue(): void {
    this.migrationQueue = [];
  }

  serialize(): SerializedStore {
    return {
      tables: this.tables.map(it => it.serialize()),
    };
  }
}
