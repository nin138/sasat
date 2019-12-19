import { ColumnCreator } from './columnCreator';
import { ColumnBuilder } from '../../migration/column/columnBuilder';

export interface TableBuilder {
  column(columnName: string): ColumnCreator;
  references(table: string, column: string, unique: boolean): TableBuilder;
  setPrimaryKey(...columnNames: string[]): TableBuilder;
  addUniqueKey(...columnNames: string[]): TableBuilder;
}

export class TableCreator {
  constructor(public tableName: string) {}
  columns: ColumnBuilder[] = [];
  column(name: string): ColumnCreator {
    if (this.isColumnExists(name)) throw new Error(`${this.tableName}.${name} already exists`);
    return new ColumnCreator(this, name);
  }
  addColumn(column: ColumnBuilder) {
    this.columns.push(column);
  }

  isColumnExists(columnName: string): boolean {
    return this.columns.find(it => it.name === columnName) !== undefined;
  }
}
