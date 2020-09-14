import { StoreMigrator } from './storeMigrator';
import { Table, TableHandler } from '../serializable/table';
import { SerializedColumn, SerializedNormalColumn } from '../serialized/serializedColumn';
import { NestedPartial } from '../../util/type';
import { GqlOption } from '../data/gqlOption';
import { Column, NormalColumn } from '../serializable/column';
import { DBIndex } from '../data';
import { SerializedTable } from '../serialized/serializedStore';
import { SqlCreator } from '../../db/sql/sqlCreater';

export interface MigrationTable extends Table {
  addIndex(...columns: string[]): MigrationTable;
  removeIndex(...columns: string[]): MigrationTable;
  addColumn(column: SerializedColumn): MigrationTable;
  dropColumn(columnName: string): MigrationTable;
  setGqlOption(option: NestedPartial<GqlOption>): MigrationTable;
}

export class TableMigrator implements MigrationTable {
  constructor(private table: TableHandler, private store: StoreMigrator) {}
  static deserialize(data: SerializedTable, store: StoreMigrator): TableMigrator {
    const handler = new TableHandler(data, store);
    return new TableMigrator(handler, store);
  }

  get tableName(): string {
    return this.table.tableName;
  }

  column(columnName: string): Column | undefined {
    return this.table.column(columnName);
  }

  showCreateTable(): string {
    return this.table.showCreateTable();
  }

  getIndexes(): DBIndex[] {
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

  addColumn(column: SerializedNormalColumn): MigrationTable {
    this.table.addColumn(new NormalColumn(column, this.table));
    this.store.addQuery(SqlCreator.addColumn(this.tableName, column));
    return this;
  }

  dropColumn(columnName: string): MigrationTable {
    this.table.dropColumn(columnName);
    this.store.addQuery(SqlCreator.dropColumn(this.tableName, columnName));
    return this;
  }

  setGqlOption(option: NestedPartial<GqlOption>): MigrationTable {
    this.table.setGqlOption(option);
    return this;
  }
}
