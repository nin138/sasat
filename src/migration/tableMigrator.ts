import { Table, TableHandler } from '../entity/table';
import { Column, NormalColumn } from '../entity/column';
import { SerializedTable } from '../entity/serializedStore';
import { StoreMigrator } from './storeMigrator';
import { DBIndex } from '../entity';
import { ColumnData } from './column/columnData';
import { SqlCreator } from '../sql/sqlCreater';

export interface MigrationTable extends Table {
  addIndex(...columns: string[]): MigrationTable;
  removeIndex(...columns: string[]): MigrationTable;
  addColumn(column: ColumnData): MigrationTable;
  dropColumn(columnName: string): MigrationTable;
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
    const index = new DBIndex(this.tableName, columns);
    this.store.addQuery(index.addSql());
    return this;
  }

  removeIndex(...columns: string[]): MigrationTable {
    this.table.removeIndex(...columns);
    this.store.addQuery(new DBIndex(this.tableName, columns).dropSql());
    return this;
  }

  addColumn(column: ColumnData): MigrationTable {
    this.table.addColumn(new NormalColumn(column, this.table));
    this.store.addQuery(SqlCreator.addColumn(this.tableName, column));
    return this;
  }

  dropColumn(columnName: string): MigrationTable {
    this.table.dropColumn(columnName);
    this.store.addQuery(SqlCreator.dropColumn(this.tableName, columnName));
    return this;
  }
}
