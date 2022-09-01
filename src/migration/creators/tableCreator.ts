import { ColumnCreator } from './columnCreator.js';
import { ColumnBuilder } from './columnBuilder.js';
import { NormalColumn } from '../serializable/column.js';
import { Reference } from '../serialized/serializedColumn.js';
import { TableHandler } from '../serializable/table.js';
import {GqlFromContextParam, MutationOption} from '../data/gqlOption.js';
import { DataStore } from '../dataStore.js';

export interface TableBuilder {
  column(columnName: string): ColumnCreator;
  references(reference: Reference, notNull?: boolean): TableBuilder;
  setPrimaryKey(...columnNames: string[]): TableBuilder;
  addUniqueKey(...columnNames: string[]): TableBuilder;
  createdAt(): TableBuilder;
  updatedAt(): TableBuilder;
  addIndex(...columns: string[]): TableBuilder;
  setGqlCreate(enabled: boolean, options?: MutationOption): TableBuilder;
  setGqlUpdate(enabled: boolean, options?: MutationOption): TableBuilder;
  setGqlDelete(enabled: boolean, options?: Omit<MutationOption, 'noReFetch'>): TableBuilder;
  setGqlContextColumn(columns: GqlFromContextParam[]): TableBuilder
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

  addColumn(column: ColumnBuilder): void {
    this.columns.push(column);
  }

  addUniqueKey(...columnNames: string[]): TableBuilder {
    this.table.addUniqueKey(...columnNames);
    return this;
  }

  references(ref: Reference, notNull = true): TableBuilder {
    this.table.addReferences(ref, undefined, notNull);
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
    this.column('createdAt').timestamp().defaultCurrentTimeStamp().notNull();
    return this;
  }

  updatedAt(): TableBuilder {
    this.column('updatedAt').timestamp().defaultCurrentTimeStamp().onUpdateCurrentTimeStamp().notNull();
    return this;
  }

  addIndex(...columns: string[]): TableBuilder {
    this.table.addIndex(`index_${this.tableName}__${columns.join('_')}`, ...columns);
    return this;
  }

  setGqlCreate(enabled: boolean, options?: MutationOption): TableBuilder  {
    this.table.setGqlCreate(enabled, options);
    return this;
  }

  setGqlUpdate(enabled: boolean, options?: MutationOption): TableBuilder  {
    this.table.setGqlUpdate(enabled, options);
    return this;
  }

  setGqlDelete(enabled: boolean, options?: Omit<MutationOption, 'noReFetch'>): TableBuilder  {
    this.table.setGqlDelete(enabled, options);
    return this;
  }

  setGqlContextColumn(columns: GqlFromContextParam[]): TableBuilder  {
    this.table.setGqlContextColumn(columns);
    return this;
  }
}
