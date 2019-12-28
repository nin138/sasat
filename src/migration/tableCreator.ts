import { ColumnCreator } from './column/columnCreator';
import { ColumnBuilder } from './column/columnBuilder';
import { TableHandler } from '../entity/table';
import { DataStore } from '../entity/dataStore';
import { NormalColumn } from '../entity/column';

export interface TableBuilder {
  column(columnName: string): ColumnCreator;
  references(table: string, column: string, unique?: boolean): TableBuilder;
  setPrimaryKey(...columnNames: string[]): TableBuilder;
  addUniqueKey(...columnNames: string[]): TableBuilder;
  createdAt(): TableBuilder;
  updatedAt(): TableBuilder;
  addIndex(...columns: string[]): TableBuilder;
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

  createdAt(): TableBuilder {
    this.column('createdAt')
      .timestamp()
      .defaultCurrentTimeStamp()
      .notNull();
    return this;
  }

  updatedAt(): TableBuilder {
    this.column('updatedAt')
      .timestamp()
      .defaultCurrentTimeStamp()
      .onUpdateCurrentTimeStamp()
      .notNull();
    return this;
  }

  addIndex(...columns: string[]): TableBuilder {
    this.table.addIndex(`index_${this.tableName}__${columns.join('_')}`, ...columns);
    return this;
  }
}