import { Index } from './index';
import { columnToSql, foreignKeyToSql } from '../sqlCreater';
import { ColumnReference, referenceToColumnInfo, referenceToForeignKey } from '../column/referenceColumn';
import { DataStore } from '../dataStore';
import { Column } from '../column/column';
import { SasatError } from '../../error';

export class Table {
  readonly indexes: Index[] = [];
  readonly columns: Column[] = [];
  protected primaryKey: string[] = [];
  protected uniqueKeys: string[][] = [];
  protected references: ColumnReference[] = [];

  protected constructor(protected store: DataStore, readonly tableName: string) {}

  serialize() {
    // TODO IMPL
  }

  addReferences(table: string, column: string, unique = false): this {
    this.references.push({
      targetTable: table,
      targetColumn: column,
      columnName: column,
      unique,
    });
    return this;
  }

  addIndex(constraintName: string, ...columns: string[]): this {
    this.indexes.push({ constraintName, columns });
    return this;
  }

  addBuiltInColumn(column: Column) {
    if (this.isColumnExists(column.name)) throw new Error(`${this.tableName}.${column.name} already exists`);
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
    const columns = this.columns.map(it => it.toSql());
    if (this.references.length !== 0) {
      columns.splice(
        this.primaryKey.length,
        0,
        ...this.references.map(it => columnToSql(referenceToColumnInfo(this.store, it))),
      );
    }
    const rows = [...columns];
    if (this.primaryKey.length !== 0) rows.push(`PRIMARY KEY (${this.primaryKey.join(',')})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0) rows.push(`UNIQUE KEY (${it.join(',')})`);
    });
    if (this.references.length !== 0)
      rows.push(...this.references.map(it => foreignKeyToSql(referenceToForeignKey(it))));
    return `CREATE TABLE ${this.tableName} ( ${rows.join(', ')} )`;
  }

  protected isColumnExists(columnName: string): boolean {
    return !!this.columns.find(it => it.name === columnName);
  }
}
