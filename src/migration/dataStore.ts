import { TableBuilder } from './table/tableBuilder';
import { addIndex } from './sqlCreater';
import { TableMigrator } from './table/tableMigrator';
import { DataStoreSchema } from './table/dataStoreSchema';
import { SasatError } from '../error';

export interface DataStore {
  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): DataStore;
  dropTable(tableName: string): DataStore;
  table(tableName: string): TableMigrator;
}

export class DataStoreMigrator implements DataStore {
  protected tables: TableMigrator[] = [];
  protected migrationQueue: string[] = [];

  table(tableName: string): TableMigrator {
    const target = this.tables.find(it => it.tableName === tableName);
    if (!target) throw new SasatError(`TABLE \`${tableName}\` NOT FOUND`);
    return target;
  }

  addMigrationQuery(query: string) {
    this.migrationQueue.push(query);
  }

  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): DataStore {
    const tmp = new TableBuilder(this, tableName);
    tableCreator(tmp);
    const table = TableMigrator.fromTableBuilder(this, tmp);
    this.tables.push(table);
    this.migrationQueue.push(table.showCreateTable());
    this.migrationQueue.push(...table.indexes.map(it => addIndex(table.tableName, it)));
    return this;
  }

  dropTable(tableName: string) {
    this.migrationQueue.push(`DROP TABLE ${tableName}`);
    return this;
  }

  getSql() {
    return this.migrationQueue;
  }

  reset() {
    this.migrationQueue = [];
  }

  serialize(): DataStoreSchema {
    return {
      tables: this.tables.map(it => it.serialize()),
    };
  }
}
