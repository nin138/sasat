import { ColumnBuilder } from '../column/columnBuilder';
import { Index } from './index';
import { ForeignKey } from './foreignKey';
import { columnToSql, foreignKeyToSql } from '../sqlCreater';
import { TableInfo } from './tableInfo';
import { ReferenceColumnInfo, referenceToColumnInfo, referenceToForeignKey } from '../column/referenceColumn';
import { DataStoreBuilder } from '../dataStore';
import { Console } from '../../cli/console';

export abstract class TableBase {
  readonly indexes: Index[] = [];
  readonly columns: ColumnBuilder[] = [];
  protected foreignKeys: ForeignKey[] = [];
  protected primaryKey: string[] = [];
  protected uniqueKeys: string[][] = [];
  protected references: ReferenceColumnInfo[] = [];

  protected constructor(protected store: DataStoreBuilder, readonly tableName: string) {}

  serialize(): TableInfo {
    return {
      tableName: this.tableName,
      columns: this.columns.map(it => {
        const ret = it.build();
        delete ret.primary;
        return ret;
      }),
      indexes: this.indexes,
      foreignKeys: this.foreignKeys,
      primaryKey: this.primaryKey,
      uniqueKeys: this.uniqueKeys,
      references: this.references,
    };
  }

  addReferences(table: string, column: string, unique = false): this {
    this.references.push({
      table,
      column,
      unique,
    });
    return this;
  }

  addIndex(constraintName: string, ...columns: string[]): this {
    this.indexes.push({ constraintName, columns });
    return this;
  }

  addBuiltInColumn(column: ColumnBuilder) {
    if (this.isColumnExists(column.name)) throw new Error(`${this.tableName}.${column.name} already exists`);
    this.columns.push(column);
  }

  addUniqueKey(...columnNames: string[]): this {
    if (columnNames.length === 0) return this;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (columnNames.length === 1) this.columns.find(it => it.name === columnNames[0])!.unique();
    else this.uniqueKeys.push(columnNames);
    return this;
  }

  addPrimaryKey(...columnNames: string[]): this {
    this.primaryKey = columnNames;
    return this;
  }

  addForeignKey(constraint: ForeignKey): this {
    this.foreignKeys.push(constraint);
    return this;
  }

  showCreateTable(): string {
    const columns = this.columns.map(it => columnToSql(it.build()));
    const rows = [...columns];
    if (this.references.length !== 0)
      rows.push(...this.references.map(it => columnToSql(referenceToColumnInfo(this.store, it))));
    if (this.primaryKey.length !== 0) rows.push(`PRIMARY KEY (${this.primaryKey.join(',')})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0) rows.push(`UNIQUE KEY (${it.join(',')})`);
    });
    if (this.foreignKeys.length !== 0) rows.push(...this.foreignKeys.map(it => foreignKeyToSql(it)));
    if (this.references.length !== 0)
      rows.push(...this.references.map(it => foreignKeyToSql(referenceToForeignKey(it))));
    return `CREATE TABLE ${this.tableName} ( ${rows.join(', ')} )`;
  }

  protected isColumnExists(columnName: string): boolean {
    return !!this.columns.find(it => it.name === columnName);
  }
}
