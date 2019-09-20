import { TableBuilder } from './table/tableBuilder';
import { addIndex } from './sqlCreater';
import { TableMigrator } from './table/tableMigrator';
import { TableInfo } from './table/tableInfo';

export abstract class DataStoreBuilder {
  protected tables: TableMigrator[] = [];

  abstract createTable(tableName: string, tableCreator: (table: TableBuilder) => void): DataStoreBuilder;

  table(tableName: string): TableMigrator | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }
}

export class DataStoreMigrator extends DataStoreBuilder {
  protected migrationQueue: string[] = [];

  addMigrationQuery(query: string) {
    this.migrationQueue.push(query);
  }

  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): DataStoreBuilder {
    const tmp = new TableBuilder(tableName);
    tableCreator(tmp);
    const table = TableMigrator.fromTableBuilder(this, tmp);
    this.tables.push(table);
    this.migrationQueue.push(table.showCreateTable());
    this.migrationQueue.push(...table.indexes.map(it => addIndex(table.tableName, it)));
    return this;
  }

  getSql() {
    return this.migrationQueue;
  }

  reset() {
    this.migrationQueue = [];
  }

  serialize(): TableInfo[] {
    return this.tables.map(it => it.serialize());
  }
}
