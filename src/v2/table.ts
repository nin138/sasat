import { Index } from '../migration/table';
import { ReferenceColumn } from './referenceColumn';
import { Column, NormalColumn } from './column';
import { SasatError } from '../error';
import { DataStore } from './dataStore';
import { SerializedTable } from './serializedStore';
import { assembleColumn } from './assembleColumn';
import { capitalizeFirstLetter } from '../util/stringUtil';

export interface Table {
  column(columnName: string): Column | undefined;
  tableName: string;
}

export class TableHandler implements Table {
  readonly indexes: Index[];
  readonly columns: Column[];
  primaryKey: string[];
  readonly uniqueKeys: string[][];
  readonly tableName: string;

  constructor(table: Partial<SerializedTable> & Pick<SerializedTable, 'tableName'>, public store: DataStore) {
    this.tableName = table.tableName;
    this.primaryKey = table.primaryKey || [];
    this.uniqueKeys = table.uniqueKeys || [];
    this.indexes = table.indexes || [];
    this.columns = (table.columns || []).map(it => assembleColumn(it, this));
  }

  column(columnName: string): Column | undefined {
    return this.columns.find(it => it.name === columnName);
  }

  addColumn(column: Column, isPrimary = false, isUnique = false) {
    this.columns.push(column);
    if (isPrimary) this.setPrimaryKey(column.name);
    if (isUnique) this.addUniqueKey(column.name);
  }

  serialize(): SerializedTable {
    return {
      columns: this.columns.map(it => it.serialize()),
      primaryKey: this.primaryKey,
      uniqueKeys: this.uniqueKeys,
      indexes: this.indexes,
      tableName: this.tableName,
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

  addIndex(constraintName: string, ...columns: string[]): this {
    this.indexes.push({ constraintName, columns });
    return this;
  }

  addBuiltInColumn(column: NormalColumn) {
    if (this.hasColumn(column.name)) throw new Error(`${this.tableName}.${column.name} already exists`);
    this.columns.push(column);
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
    console.log(this);
    const columns = this.columns.map(it => it.toSql());
    const rows = [...columns];
    if (this.primaryKey.length !== 0) rows.push(`PRIMARY KEY (${this.primaryKey.join(',')})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0) rows.push(`UNIQUE KEY (${it.join(',')})`);
    });
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
