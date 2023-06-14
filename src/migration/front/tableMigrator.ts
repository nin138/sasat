import { StoreMigrator } from './storeMigrator.js';
import { Table, TableHandler } from '../serializable/table.js';
import {
  Reference,
  SerializedColumn,
  SerializedNormalColumn,
} from '../serialized/serializedColumn.js';
import { GQLMutation, GQLOption, GQLQuery } from '../data/GQLOption.js';
import {
  BaseColumn,
  NormalColumn,
  ReferenceColumn,
} from '../serializable/column.js';
import { SerializedTable } from '../serialized/serializedStore.js';
import { SqlCreator } from '../../db/sql/sqlCreater.js';
import { DBColumnTypes, DBType } from '../column/columnTypes.js';
import { SqlString } from '../../runtime/sql/sqlString.js';
import { DBIndex } from '../data/index.js';
import { CreateColumn, createColumn } from '../creators/createColumn.js';
import { ColumnBuilder } from '../creators/columnBuilder.js';

export interface MigrationTable extends Table {
  addIndex(...columns: string[]): MigrationTable;
  removeIndex(...columns: string[]): MigrationTable;
  addColumn(
    name: string,
    create: (column: CreateColumn) => ColumnBuilder,
  ): MigrationTable;
  _addColumn(column: SerializedColumn): MigrationTable;
  dropColumn(columnName: string): MigrationTable;
  addForeignKey(reference: Reference): MigrationTable;
  changeColumnType(columnName: string, type: DBType): MigrationTable;
  setDefault(columnName: string, value: string | number | null): MigrationTable;
  enableGQL(): MigrationTable;
  setGQLOption(option: GQLOption): MigrationTable;
  addGQLQuery(...queries: GQLQuery[]): MigrationTable;
  addGQLMutation(...mutations: GQLMutation[]): MigrationTable;
}

export class TableMigrator implements MigrationTable {
  constructor(private table: TableHandler, private store: StoreMigrator) {}
  get primaryKey(): string[] {
    return this.table.primaryKey;
  }
  static deserialize(
    data: SerializedTable,
    store: StoreMigrator,
  ): TableMigrator {
    const handler = new TableHandler(data, store);
    return new TableMigrator(handler, store);
  }

  get tableName(): string {
    return this.table.tableName;
  }

  column(columnName: string): BaseColumn {
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

  _addColumn(column: SerializedNormalColumn): MigrationTable {
    this.table.addColumn(new NormalColumn(column, this.table));
    this.store.addQuery(SqlCreator.addColumn(this.tableName, column));
    return this;
  }

  addColumn(name: string, create: (column: CreateColumn) => ColumnBuilder) {
    const column = create(createColumn(name)).build();
    return this._addColumn(column.data);
  }

  dropColumn(columnName: string): MigrationTable {
    this.table.dropColumn(columnName);
    this.store.addQuery(SqlCreator.dropColumn(this.tableName, columnName));
    return this;
  }

  enableGQL(): MigrationTable {
    this.table.setGQLOption({
      ...this.table.gqlOption,
      enabled: true,
    });
    return this;
  }

  setGQLOption(option: GQLOption): MigrationTable {
    this.table.setGQLOption(option);
    return this;
  }

  addForeignKey(reference: Reference): MigrationTable {
    this.tableExists(reference.parentTable);
    this.table.addForeignKey(reference);
    const column = this.table.column(reference.columnName) as ReferenceColumn;
    const targetColumn = this.store
      .table(reference.parentTable)!
      .column(reference.parentColumn);
    if (!targetColumn)
      throw new Error(
        'Column: ' +
          reference.parentTable +
          '.' +
          reference.parentColumn +
          ' Not Exists',
      );
    if (column.dataType() !== targetColumn.dataType()) {
      throw new Error(
        `${this.tableName}.${reference.columnName} AND ${
          reference.parentTable
        }.${
          reference.parentColumn
        } is different Type( ${column.dataType()} != ${targetColumn.dataType()} )`,
      );
    }
    this.store.addQuery(
      SqlCreator.addForeignKey(
        this.tableName,
        column.getConstraintName(),
        reference,
      ),
    );
    return this;
  }

  changeColumnType(columnName: string, type: DBType): MigrationTable {
    this.table.changeType(columnName, type as DBColumnTypes);
    this.store.addQuery(
      `ALTER TABLE ${this.tableName} MODIFY ${columnName} ${type}`,
    );
    return this;
  }

  protected tableExists(tableName: string): true {
    if (!this.store.table(tableName)) {
      throw new Error('QueryTable: ' + tableName + ' Not Exists');
    }
    return true;
  }

  setDefault(
    columnName: string,
    value: string | number | null,
  ): MigrationTable {
    // ALTER ... SET DEFAULT
    this.table.setDefault(columnName, value);
    this.store.addQuery(
      `ALTER TABLE ${
        this.tableName
      } ALTER ${columnName} SET DEFAULT ${SqlString.escape(value)}`,
    );
    return this;
  }

  get gqlOption(): GQLOption {
    return this.table.gqlOption;
  }
  addGQLQuery(...queries: GQLQuery[]): MigrationTable {
    this.table.setGQLOption({
      ...this.table.gqlOption,
      queries: [...this.table.gqlOption.queries, ...queries],
    });
    return this;
  }
  addGQLMutation(...mutations: GQLMutation[]): MigrationTable {
    this.table.setGQLOption({
      ...this.table.gqlOption,
      mutations: [...this.table.gqlOption.mutations, ...mutations],
    });
    return this;
  }
}
