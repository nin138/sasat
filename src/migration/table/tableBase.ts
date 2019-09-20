import { ColumnBuilder } from '../column/columnBuilder';
import { Index } from './index';
import { ForeignKey, ForeignKeyReferentialAction } from './foreignKey';
import { columnToSql, foreignKeyToSql } from '../sqlCreater';
import { TableInfo } from './tableInfo';

export abstract class TableBase {
  readonly indexes: Index[] = [];
  readonly columns: ColumnBuilder[] = [];
  protected foreignKeys: ForeignKey[] = [];
  protected primaryKey: string[] = [];
  protected uniqueKeys: string[][] = [];

  protected constructor(readonly tableName: string) {}

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
    };
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
    columnNames.forEach(it => {
      if (!this.isColumnExists(it)) throw new Error(`${this.tableName}.${it} does not exists`);
    });
    if (columnNames.length === 0) return this;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (columnNames.length === 1) this.columns.find(it => it.name === columnNames[0])!.unique();
    else this.uniqueKeys.push(columnNames);
    return this;
  }

  addPrimaryKey(...columnNames: string[]): this {
    columnNames.forEach(it => {
      if (!this.isColumnExists(it)) throw new Error(`${this.tableName}.${it} does not exists`);
    });
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
    if (this.primaryKey.length !== 0) rows.push(`PRIMARY KEY (${this.primaryKey.join(',')})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0) rows.push(`UNIQUE KEY (${it.join(',')})`);
    });
    if (this.foreignKeys.length !== 0) rows.push(...this.foreignKeys.map(it => foreignKeyToSql(it)));

    return `CREATE TABLE ${this.tableName} ( ${rows.join(', ')} )`;
  }

  protected isColumnExists(columnName: string): boolean {
    return !!this.columns.find(it => it.name === columnName);
  }
}
