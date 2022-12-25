import { StoreMigrator } from './storeMigrator.js';
import { Table, TableHandler } from '../serializable/table.js';
import {
  Reference,
  SerializedColumn,
  SerializedNormalColumn,
} from '../serialized/serializedColumn.js';
import {
  GqlFromContextParam,
  GQLOption,
  MutationOption,
} from '../data/GQLOption.js';
import {
  Column,
  NormalColumn,
  ReferenceColumn,
} from '../serializable/column.js';
import { SerializedTable } from '../serialized/serializedStore.js';
import { SqlCreator } from '../../db/sql/sqlCreater.js';
import { DBColumnTypes, DBType } from '../column/columnTypes.js';
import { SqlString } from '../../runtime/sql/sqlString.js';
import { DBIndex } from '../data/index.js';

export interface MigrationTable extends Table {
  addIndex(...columns: string[]): MigrationTable;
  removeIndex(...columns: string[]): MigrationTable;
  addColumn(column: SerializedColumn): MigrationTable;
  dropColumn(columnName: string): MigrationTable;
  addForeignKey(reference: Reference): MigrationTable;
  changeColumnType(columnName: string, type: DBType): MigrationTable;
  setDefault(columnName: string, value: string | number | null): MigrationTable;
  setGQLCreate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): MigrationTable;
  setGQLUpdate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): MigrationTable;
  setGQLDelete(
    enabled: boolean,
    options?: Partial<Omit<MutationOption, 'noReFetch'>>,
  ): MigrationTable;
  setGQLContextColumn(columns: GqlFromContextParam[]): MigrationTable;

  enableGQL(): MigrationTable;

  setGQLOption(option: GQLOption): MigrationTable;
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

  setGQLCreate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): MigrationTable {
    this.table.setGQLCreate(enabled, options);
    return this;
  }

  setGQLUpdate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): MigrationTable {
    this.table.setGQLUpdate(enabled, options);
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

  setGQLDelete(
    enabled: boolean,
    options?: Partial<Omit<MutationOption, 'noReFetch'>>,
  ): MigrationTable {
    this.table.setGQLDelete(enabled, options);
    return this;
  }

  setGQLContextColumn(columns: GqlFromContextParam[]): MigrationTable {
    this.table.setGQLContextColumn(columns);
    return this;
  }

  addForeignKey(reference: Reference): MigrationTable {
    this.tableExists(reference.targetTable);
    this.table.addForeignKey(reference);
    const column = this.table.column(reference.columnName) as ReferenceColumn;
    const targetColumn = this.store
      .table(reference.targetTable)!
      .column(reference.targetColumn);
    if (!targetColumn)
      throw new Error(
        'Column: ' +
          reference.targetTable +
          '.' +
          reference.targetColumn +
          ' Not Exists',
      );
    if (column.dataType() !== targetColumn.dataType()) {
      throw new Error(
        `${this.tableName}.${reference.columnName} AND ${
          reference.targetTable
        }.${
          reference.targetColumn
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
}
