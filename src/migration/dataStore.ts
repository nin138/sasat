import { TableBuilder } from "./table/tableBuilder";
import { addIndex } from "./sqlCreater";

export abstract class DataStoreBuilder {
  protected tables: TableBuilder[] = [];

  abstract createTable(tableName: string, tableCreator: (table: TableBuilder) => void): DataStoreBuilder;

  table(tableName: string): TableBuilder | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }
}

export class DataStoreMigrator extends DataStoreBuilder {
  protected migrationQueue: string[] = [];

  addMigrationQuery(query: string) {
    this.migrationQueue.push(query);
  }

  createTable(tableName: string, tableCreator: (table: TableBuilder) => void): DataStoreBuilder {
    const table = new TableBuilder(tableName);
    tableCreator(table);
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
}
