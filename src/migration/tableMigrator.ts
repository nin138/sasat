import { Table, TableHandler } from '../entity/table';
import { Column } from '../entity/column';
import { SerializedTable } from '../entity/serializedStore';

export class TableMigrator implements Table {
  constructor(private table: TableHandler) {}

  get tableName() {
    return this.table.tableName;
  }

  column(columnName: string): Column | undefined {
    return this.table.column(columnName);
  }

  showCreateTable() {
    return this.table.showCreateTable();
  }

  getIndexes() {
    return this.table.indexes;
  }

  serialize(): SerializedTable {
    return this.table.serialize();
  }
}
