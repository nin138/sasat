import { Table, TableHandler } from '../entity/table';
import { Column } from '../entity/column';
import { SerializedTable } from '../entity/serializedStore';
import { StoreMigrator } from './storeMigrator';

export interface MigrationTable extends Table {
  addIndex(...columns: string[]): MigrationTable;
  removeIndex(...columns: string[]): MigrationTable;
}

export class TableMigrator implements MigrationTable {
  constructor(private table: TableHandler, private store: StoreMigrator) {}

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
    return this.table.index;
  }

  serialize(): SerializedTable {
    return this.table.serialize();
  }

  addIndex(...columns: string[]): MigrationTable {
    this.table.addIndex(...columns);
    // this.store.addQuery(addIndex(this.tableName, { constraintName:  }))
    // TODO
    return this;
  }

  removeIndex(...columns: string[]): MigrationTable {
    // TODO
    this.table.removeIndex(...columns);
    return this;
  }
}
