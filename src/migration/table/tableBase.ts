import { ColumnBuilder } from "../column/columnBuilder";
import { Index } from "../../types";
import { ForeignKey } from "../../types/foreignKey";
import { columnToSql, foreignKeyToSql } from "../sqlCreater";

export abstract class TableBase {
  readonly columns: ColumnBuilder[] = [];
  readonly indexes: Index[] = [];
  readonly foreignKeys: ForeignKey[] = [];
  protected primaryKey: string[] | undefined;
  protected uniqueKeys: string[][] = [];

  protected constructor(readonly tableName: string) {}

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

  showCreateTable(): string {
    const columns = this.columns.map(it => columnToSql(it.build()));
    const rows = [...columns];
    if (this.primaryKey) rows.push(`PRIMARY KEY (${this.primaryKey.join(",")})`);
    this.uniqueKeys.forEach(it => {
      if (this.uniqueKeys.length !== 0) rows.push(`UNIQUE KEY (${it.join(",")})`);
    });
    if (this.foreignKeys.length !== 0) rows.push(...this.foreignKeys.map(it => foreignKeyToSql(it)));

    return `CREATE TABLE ${this.tableName} ( ${rows.join(", ")} )`;
  }

  protected isColumnExists(columnName: string): boolean {
    return !!this.columns.find(it => it.name === columnName);
  }
}
