import { DBIndex } from './index';
import { ReferenceColumn, ReferenceColumnData } from './referenceColumn';
import { Column } from './column';
import { SasatError } from '../error';
import { DataStore } from './dataStore';
import { SerializedTable } from './serializedStore';
import { assembleColumn } from './assembleColumn';
import { capitalizeFirstLetter } from '../util/stringUtil';
import {
  getDefaultGqlOption,
  GqlOption,
  mergeGqlOption,
} from '../migration/gqlOption';
import { NestedPartial } from '../util/type';
import { escapeName } from '../sql/escape';

export interface Table {
  column(columnName: string): Column | undefined;
  tableName: string;
}

export class TableHandler implements Table {
  static tableNameToEntityName(tableName: string) {
    return capitalizeFirstLetter(tableName);
  }
  private indexes: DBIndex[];
  get index() {
    return this.indexes;
  }
  private _columns: Column[];
  get columns() {
    return this._columns;
  }
  primaryKey: string[];
  readonly uniqueKeys: string[][];
  readonly tableName: string;
  private _gqlOption: GqlOption = getDefaultGqlOption();
  get gqlOption() {
    return this._gqlOption;
  }

  constructor(
    table: Partial<SerializedTable> & Pick<SerializedTable, 'tableName'>,
    public store: DataStore,
  ) {
    this.tableName = table.tableName;
    this.primaryKey = table.primaryKey || [];
    this.uniqueKeys = table.uniqueKeys || [];
    this.indexes =
      table.indexes?.map(it => new DBIndex(this.tableName, it.columns)) || [];
    this._gqlOption = table.gqlOption || getDefaultGqlOption();
    this._columns = (table.columns || []).map(it => assembleColumn(it, this));
  }

  column(columnName: string): Column | undefined {
    return this.columns.find(it => it.name === columnName);
  }

  addColumn(column: Column, isPrimary = false, isUnique = false) {
    this.columns.push(column);
    if (isPrimary) this.setPrimaryKey(column.name);
    if (isUnique) this.addUniqueKey(column.name);
  }

  dropColumn(columnName: string) {
    this._columns = this._columns.filter(it => it.name !== columnName);
  }

  serialize(): SerializedTable {
    return {
      columns: this.columns.map(it => it.serialize()),
      primaryKey: this.primaryKey,
      uniqueKeys: this.uniqueKeys,
      indexes: this.indexes,
      tableName: this.tableName,
      gqlOption: this.gqlOption,
    };
  }

  addReferences(data: ReferenceColumnData): this {
    this.columns.push(new ReferenceColumn(data, this));

    return this;
  }

  private getIndexConstraintName(columns: string[]): string {
    return `index_${this.tableName}__${columns.join('_')}`;
  }

  addIndex(...columns: string[]): this {
    this.indexes.push(new DBIndex(this.tableName, columns));
    return this;
  }

  removeIndex(...columns: string[]): this {
    const constraint = this.getIndexConstraintName(columns);
    this.indexes = this.indexes.filter(it => it.constraintName !== constraint);
    return this;
  }

  addUniqueKey(...columnNames: string[]): this {
    if (columnNames.length === 0)
      throw new SasatError('No column name specified');
    this.uniqueKeys.push(columnNames);
    return this;
  }

  setPrimaryKey(...columnNames: string[]): this {
    this.primaryKey = columnNames;
    return this;
  }

  showCreateTable(): string {
    const columns = this.columns.map(it => it.toSql());
    const rows = [...columns];
    if (this.primaryKey.length !== 0)
      rows.push(`PRIMARY KEY (${this.primaryKey.map(escapeName).join(',')})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0)
        rows.push(`UNIQUE KEY (${it.join(',')})`);
    });
    rows.push(
      ...this._columns
        .filter(it => it.isReference())
        .map(it => {
          const ref = it as ReferenceColumn;
          return `\
CONSTRAINT ${ref.getConstraintName()} \
FOREIGN KEY (${escapeName(it.name)}) \
REFERENCES ${escapeName(ref.data.targetTable)} \
(${escapeName(ref.data.targetColumn)})`;
        }),
    );
    return `CREATE TABLE ${escapeName(this.tableName)} ( ${rows.join(', ')} )`;
  }

  hasColumn(columnName: string): boolean {
    return !!this.columns.find(it => it.name === columnName);
  }
  isColumnPrimary(columnName: string): boolean {
    return this.primaryKey.includes(columnName);
  }

  getEntityName(): string {
    return TableHandler.tableNameToEntityName(this.tableName);
  }

  setGqlOption(option: NestedPartial<GqlOption>) {
    this._gqlOption = mergeGqlOption(this.gqlOption, option);
  }

  primaryKeyColumns(): Column[] {
    return this.columns.filter(it => this.isColumnPrimary(it.name));
  }

  getReferenceColumns(): ReferenceColumn[] {
    return this.columns.filter(it => it.isReference()) as ReferenceColumn[];
  }
}
