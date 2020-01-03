import { DBIndex } from './index';
import { ReferenceColumn } from './referenceColumn';
import { Column } from './column';
import { SasatError } from '../error';
import { DataStore } from './dataStore';
import { SerializedTable } from './serializedStore';
import { assembleColumn } from './assembleColumn';
import { capitalizeFirstLetter } from '../util/stringUtil';
import { getDefaultGqlOption, GqlOption } from '../migration/gqlOption';

export interface Table {
  column(columnName: string): Column | undefined;
  tableName: string;
}

export class TableHandler implements Table {
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
  gqlOption: GqlOption = getDefaultGqlOption();

  constructor(table: Partial<SerializedTable> & Pick<SerializedTable, 'tableName'>, public store: DataStore) {
    this.tableName = table.tableName;
    this.primaryKey = table.primaryKey || [];
    this.uniqueKeys = table.uniqueKeys || [];
    this.indexes = table.indexes?.map(it => new DBIndex(this.tableName, it.columns)) || [];
    this.gqlOption = table.gqlOption || getDefaultGqlOption();
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

  addReferences(table: string, column: string, unique = false): this {
    this.columns.push(
      new ReferenceColumn(
        {
          type: 'REFERENCE',
          targetTable: table,
          targetColumn: column,
          columnName: column,
          unique,
        },
        this,
      ),
    );

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
    if (this.primaryKey.length !== 0) rows.push(`PRIMARY KEY (${this.primaryKey.join(',')})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0) rows.push(`UNIQUE KEY (${it.join(',')})`);
    });
    rows.push(
      ...this._columns
        .filter(it => it.isReference())
        .map(it => {
          const ref = it as ReferenceColumn;
          return `CONSTRAINT ${ref.getConstraintName()} FOREIGN KEY (${it.name}) REFERENCES ${ref.data.targetTable} (${
            ref.data.targetColumn
          })`;
        }),
    );
    return `CREATE TABLE ${this.tableName} ( ${rows.join(', ')} )`;
  }

  hasColumn(columnName: string): boolean {
    return !!this.columns.find(it => it.name === columnName);
  }
  isColumnPrimary(columnName: string): boolean {
    return this.primaryKey.includes(columnName);
  }

  getEntityName(): string {
    return capitalizeFirstLetter(this.tableName);
  }
}
