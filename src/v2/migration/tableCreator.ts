import { ColumnCreator } from './columnCreator';
import { ColumnBuilder } from '../../migration/column/columnBuilder';
import { TableHandler } from '../table';
import { DataStore } from '../dataStore';
import { NormalColumn } from '../column';

export interface TableBuilder {
  column(columnName: string): ColumnCreator;
  references(table: string, column: string, unique?: boolean): TableBuilder;
  setPrimaryKey(...columnNames: string[]): TableBuilder;
  addUniqueKey(...columnNames: string[]): TableBuilder;
}

export class TableCreator implements TableBuilder {
  private readonly table: TableHandler;
  private readonly columns: ColumnBuilder[] = [];

  constructor(public tableName: string, store: DataStore) {
    this.table = new TableHandler({ tableName }, store);
  }

  column(name: string): ColumnCreator {
    if (this.table.hasColumn(name)) throw new Error(`${this.tableName}.${name} already exists`);
    return new ColumnCreator(this, name);
  }

  addColumn(column: ColumnBuilder) {
    this.columns.push(column);
  }

  addUniqueKey(...columnNames: string[]): TableBuilder {
    this.table.addUniqueKey(...columnNames);
    return this;
  }

  references(table: string, column: string, unique = false): TableBuilder {
    this.table.addReferences(table, column, unique);
    return this;
  }

  setPrimaryKey(...columnNames: string[]): TableBuilder {
    this.table.setPrimaryKey(...columnNames);
    return this;
  }

  create(): TableHandler {
    this.columns.forEach(column => {
      const { data, isPrimary, isUnique } = column.build();
      this.table.addColumn(new NormalColumn(data, this.table), isPrimary, isUnique);
    });
    return this.table;
  }
}
