import { SasatError } from '../error';
import { addIndex } from '../sql/sqlCreater';
import { DataStore } from '../entity/dataStore';
import { TableMigrator } from './tableMigrator';
import { TableBuilder, TableCreator } from './tableCreator';
import { SerializedStore } from '../entity/serializedStore';

export interface MigrationStore extends DataStore {
  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): MigrationStore;
  dropTable(tableName: string): MigrationStore;
}

export class StoreMigrator implements MigrationStore {
  protected tables: TableMigrator[] = [];
  protected migrationQueue: string[] = [];

  table(tableName: string): TableMigrator | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }

  protected addQuery(...query: string[]) {
    this.migrationQueue.push(...query);
  }

  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): MigrationStore {
    if (this.table(tableName)) throw new SasatError(`${tableName} is already exist`);
    const creator = new TableCreator(tableName, this);
    tableCreator(creator);
    const table = new TableMigrator(creator.create());
    this.tables.push(table);
    this.addQuery(table.showCreateTable());
    this.addQuery(...table.getIndexes().map(it => addIndex(table.tableName, it)));
    return this;
  }

  dropTable(tableName: string) {
    this.addQuery(`DROP TABLE ${tableName}`);
    return this;
  }

  getSql() {
    return this.migrationQueue;
  }

  resetQueue() {
    this.migrationQueue = [];
  }

  serialize(): SerializedStore {
    return {
      tables: this.tables.map(it => it.serialize()),
    };
  }
}
