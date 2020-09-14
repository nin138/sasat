import { Serializable } from './serializable';
import { SerializedTable } from '../serialized/serializedStore';
import { Column, ReferenceColumn } from './column';
import { capitalizeFirstLetter } from '../../util/stringUtil';
import { DBIndex } from './index';
import { getDefaultGqlOption, GqlOption, mergeGqlOption } from '../gqlOption';
import { NestedPartial } from '../../util/type';
import { EntityName } from '../../entity/entityName';
import { SqlString } from '../../runtime/query/sql/sqlString';
import { SasatError } from '../../error';
import { Reference, SerializedReferenceColumn } from '../serialized/serializedColumn';
import { assembleColumn } from '../../entity/assembleColumn';
import { DataStore } from '../../entity/dataStore';

export interface Table extends Serializable<SerializedTable> {
  column(columnName: string): Column | undefined;
  tableName: string;
}

export class TableHandler implements Table {
  static tableNameToEntityName(tableName: string): string {
    return capitalizeFirstLetter(tableName);
  }
  private indexes: DBIndex[];
  get index(): DBIndex[] {
    return this.indexes;
  }
  private _columns: Column[];
  get columns(): Column[] {
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

  column(columnName: string): Column | undefined {
    return this.columns.find(it => it.columnName() === columnName);
  }

  addColumn(column: Column, isPrimary = false, isUnique = false): void {
    this.columns.push(column);
    if (isPrimary) this.setPrimaryKey(column.columnName());
    if (isUnique) this.addUniqueKey(column.columnName());
  }

  dropColumn(columnName: string): void {
    this._columns = this._columns.filter(it => it.columnName() !== columnName);
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

  addReferences(ref: Reference): this {
    const target = this.store.table(ref.targetTable)?.column(ref.targetColumn);
    if (!target) throw new Error(ref.targetTable + ' . ' + ref.targetColumn + ' NOT FOUND');
    const targetData = target.serialize();
    const data: SerializedReferenceColumn = {
      ...targetData,
      hasReference: true,
      columnName: ref.columnName,
      notNull: true,
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
        .filter(it => it.isReference())
        .map(it => {
          const ref = it as ReferenceColumn;
          return `\
CONSTRAINT ${ref.getConstraintName()} \
FOREIGN KEY (${SqlString.escapeId(it.columnName())}) \
REFERENCES ${SqlString.escapeId(ref.data.reference.targetTable)} \
(${SqlString.escapeId(ref.data.reference.targetColumn)})`;
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

  primaryKeyColumns(): Column[] {
    return this.columns.filter(it => this.isColumnPrimary(it.columnName()));
  }

  getReferenceColumns(): ReferenceColumn[] {
    return this.columns.filter(it => it.isReference()) as ReferenceColumn[];
  }
}
