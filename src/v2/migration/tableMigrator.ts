import { Table, TableHandler } from '../table';
import { Column } from '../column';
import { DataStore } from '../dataStore';

export class TableMigrator implements Table {
  private table: TableHandler;

  constructor(tableName: string, store: DataStore) {
    this.table = new TableHandler(tableName, store);
  }

  get tableName() {
    return this.table.tableName;
  }

  column(columnName: string): Column | undefined {
    return this.table.column(columnName);
  }
}
