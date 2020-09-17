import { StoreMigrator } from './storeMigrator';
import { Table, TableHandler } from '../serializable/table';
import { Reference, SerializedColumn, SerializedNormalColumn } from '../serialized/serializedColumn';
import { NestedPartial } from '../../util/type';
import { GqlOption } from '../data/gqlOption';
import { Column, NormalColumn, ReferenceColumn } from '../serializable/column';
import { DBIndex } from '../data';
import { SerializedTable } from '../serialized/serializedStore';
import { SqlCreator } from '../../db/sql/sqlCreater';
import { DBColumnTypes, DBType } from '../column/columnTypes';
import { SqlString } from '../../runtime/query/sql/sqlString';

export interface MigrationTable extends Table {
  addIndex(...columns: string[]): MigrationTable;
  removeIndex(...columns: string[]): MigrationTable;
  addColumn(column: SerializedColumn): MigrationTable;
  dropColumn(columnName: string): MigrationTable;
  setGqlOption(option: NestedPartial<GqlOption>): MigrationTable;
  addForeignKey(reference: Reference): MigrationTable;
  changeColumnType(columnName: string, type: DBType): MigrationTable;
  setDefault(columnName: string, value: string | number | null): MigrationTable;
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

  column(columnName: string): Column {
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

  addForeignKey(reference: Reference): MigrationTable {
    this.tableExists(reference.targetTable);
    this.table.addForeignKey(reference);
    const column = this.table.column(reference.columnName) as ReferenceColumn;
    const targetColumn = this.store.table(reference.targetTable)!.column(reference.targetColumn);
    if (!targetColumn)
      throw new Error('Column: ' + reference.targetTable + '.' + reference.targetColumn + ' Not Exists');
    if (column.dataType() !== targetColumn.dataType()) {
      throw new Error(
        `${this.tableName}.${reference.columnName} AND ${reference.targetTable}.${
          reference.targetColumn
        } is different Type( ${column.dataType()} != ${targetColumn.dataType()} )`,
      );
    }
    this.store.addQuery(SqlCreator.addForeignKey(this.tableName, column.getConstraintName(), reference));
    return this;
  }

  changeColumnType(columnName: string, type: DBType): MigrationTable {
    this.table.changeType(columnName, type as DBColumnTypes);
    this.store.addQuery(`ALTER TABLE ${this.tableName} MODIFY ${columnName} ${type}`);
    return this;
  }

  protected tableExists(tableName: string): true {
    if (!this.store.table(tableName)) {
      throw new Error('Table: ' + tableName + ' Not Exists');
    }
    return true;
  }

  setDefault(columnName: string, value: string | number | null): MigrationTable {
    // ALTER ... SET DEFAULT
    this.table.setDefault(columnName, value);
    this.store.addQuery(`ALTER TABLE ${this.tableName} ALTER ${columnName} SET DEFAULT ${SqlString.escape(value)}`);
    return this;
  }
}
