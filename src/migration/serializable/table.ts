import { Serializable } from './serializable.js';
import { SerializedTable } from '../serialized/serializedStore.js';
import { BaseColumn, Column, NormalColumn, ReferenceColumn } from './column.js';
import { camelize, capitalizeFirstLetter } from '../../util/stringUtil.js';
import { NestedPartial } from '../../util/type.js';
import { SqlString } from '../../runtime/sql/sqlString.js';
import { SasatError } from '../../error.js';
import {
  Reference,
  referenceToSql,
  SerializedColumn,
  SerializedNormalColumn,
  SerializedReferenceColumn,
} from '../serialized/serializedColumn.js';
import { DBIndex } from '../data/index.js';
import { getDefaultGqlOption, GqlOption, mergeGqlOption } from '../data/gqlOption.js';
import { assembleColumn } from '../functions/assembleColumn.js';
import { EntityName } from '../../parser/node/entityName.js';
import { DataStore } from '../dataStore.js';
import { DBColumnTypes } from '../column/columnTypes.js';

export interface Table extends Serializable<SerializedTable> {
  column(columnName: string): Column;
  tableName: string;
}

export class TableHandler implements Table {
  static tableNameToEntityName(tableName: string): string {
    return capitalizeFirstLetter(camelize(tableName));
  }
  private indexes: DBIndex[];
  get index(): DBIndex[] {
    return this.indexes;
  }
  private _columns: BaseColumn[];
  get columns(): BaseColumn[] {
    return this._columns;
  }
  primaryKey: string[];
  readonly uniqueKeys: string[][];
  readonly tableName: string;
  private _gqlOption: GqlOption = getDefaultGqlOption();
  get gqlOption(): GqlOption {
    return this._gqlOption;
  }

  constructor(table: Partial<SerializedTable> & Pick<SerializedTable, 'tableName'>, public store: DataStore) {
    this.tableName = table.tableName;
    this.primaryKey = table.primaryKey || [];
    this.uniqueKeys = table.uniqueKeys || [];
    this.indexes = table.indexes?.map(it => new DBIndex(this.tableName, it.columns)) || [];
    this._gqlOption = table.gqlOption || getDefaultGqlOption();
    this._columns = (table.columns || []).map(it => assembleColumn(it, this));
  }

  column(columnName: string): Column {
    const column = this.columns.find(it => it.columnName() === columnName);
    if (!column) throw new Error(`${this.tableName}.${columnName} is Not Found`);
    return column;
  }

  addColumn(column: BaseColumn, isPrimary = false, isUnique = false): void {
    this.columns.push(column);
    if (isPrimary) this.setPrimaryKey(column.columnName());
    if (isUnique) this.addUniqueKey(column.columnName());
  }

  dropColumn(columnName: string): void {
    this._columns = this._columns.filter(it => it.fieldName() !== columnName);
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

  addReferences(ref: Reference, fieldName?: string, notNull = true): this {
    const target = this.store.table(ref.targetTable).column(ref.targetColumn);
    const targetData = target.serialize();
    const data: SerializedReferenceColumn = {
      ...targetData,
      hasReference: true,
      fieldName: fieldName || ref.columnName,
      columnName: ref.columnName,
      notNull,
      default: undefined,
      zerofill: false,
      autoIncrement: false,
      defaultCurrentTimeStamp: false,
      onUpdateCurrentTimeStamp: false,
      reference: ref,
    };
    this.columns.push(new ReferenceColumn(data, this));
    return this;
  }

  private getIndexConstraintName(columns: string[]): string {
    // TODO max len = 64 https://dev.mysql.com/doc/refman/8.0/en/identifier-length.html
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
    if (columnNames.length === 0) throw new SasatError('No column name specified');
    this.uniqueKeys.push(columnNames);
    return this;
  }

  setPrimaryKey(...columnNames: string[]): this {
    if (columnNames.length === 0) throw new Error('Primary key is required');
    this.primaryKey = columnNames;
    return this;
  }

  showCreateTable(): string {
    const columns = this.columns.map(it => it.toSql());
    const rows = [...columns];
    if (this.primaryKey.length !== 0) rows.push(`PRIMARY KEY (${this.primaryKey.map(SqlString.escapeId).join(',')})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0) rows.push(`UNIQUE KEY (${it.join(',')})`);
    });
    rows.push(
      ...this._columns
        .filter(it => it.isReference() && it.data.reference.noFKey)
        .map(it => {
          const ref = it as ReferenceColumn;
          return referenceToSql(ref.getConstraintName(), ref.data.reference);
        }),
    );
    return `CREATE TABLE ${SqlString.escapeId(this.tableName)} ( ${rows.join(', ')} )`;
  }

  hasColumn(columnName: string): boolean {
    return !!this.columns.find(it => it.columnName() === columnName);
  }
  isColumnPrimary(columnName: string): boolean {
    return this.primaryKey.includes(columnName);
  }

  getEntityName(): EntityName {
    return new EntityName(TableHandler.tableNameToEntityName(this.tableName));
  }

  // TODO fix type nest partial
  setGqlOption(option: NestedPartial<GqlOption>): void {
    this._gqlOption = mergeGqlOption(this.gqlOption, option);
  }

  getReferenceColumns(): ReferenceColumn[] {
    return this.columns.filter(it => it.isReference()) as ReferenceColumn[];
  }

  addForeignKey(reference: Reference): void {
    const columnName = reference.columnName;
    const column1 = this.column(columnName);
    if (!column1) throw new Error('Column: `' + columnName + '` Not Found');
    // TODO
    if (column1.isReference())
      throw new Error('Column: `' + columnName + '`already has reference, multiple reference is not supported');
    const ref = (column1 as NormalColumn).addReference(reference);
    this._columns = this.columns.map(it => (it.columnName() === columnName ? ref : it));
  }

  changeType(columnName: string, type: DBColumnTypes): void {
    this.updateColumn(columnName, { type });
  }

  setDefault(columnName: string, value: string | number | null): void {
    this.updateColumn(columnName, { default: value });
  }
  protected updateColumn(columnName: string, diff: Partial<SerializedColumn>): void {
    const update = (column: BaseColumn) => {
      if (column.isReference())
        return new ReferenceColumn({ ...column.serialize(), ...diff } as SerializedReferenceColumn, this);
      return new NormalColumn({ ...column.serialize(), ...diff } as SerializedNormalColumn, this);
    };
    if (!this.column(columnName)) {
      throw new Error(this.tableName + '.' + columnName + ' Not Found');
    }
    this._columns = this.columns.map(it => (it.columnName() === columnName ? update(it) : it));
  }
}
