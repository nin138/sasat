import { ColumnCreator } from './columnCreator.js';
import { ColumnBuilder } from './columnBuilder.js';
import { NormalColumn } from '../serializable/column.js';
import { Reference } from '../serialized/serializedColumn.js';
import { TableHandler } from '../serializable/table.js';
import {GqlFromContextParam, GQLOption, MutationOption} from '../data/GQLOption.js';
import { DataStore } from '../dataStore.js';

export interface TableBuilder {
  column(columnName: string): ColumnCreator;

  references(reference: Reference, notNull?: boolean): TableBuilder;

  setPrimaryKey(...columnNames: string[]): TableBuilder;

  addUniqueKey(...columnNames: string[]): TableBuilder;

  createdAt(): TableBuilder;

  updatedAt(): TableBuilder;

  addIndex(...columns: string[]): TableBuilder;

  setGQLCreate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): TableBuilder;

  setGQLUpdate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): TableBuilder;

  setGQLDelete(
    enabled: boolean,
    options?: Partial<Omit<MutationOption, 'noReFetch'>>,
  ): TableBuilder;

  setGQLContextColumn(columns: GqlFromContextParam[]): TableBuilder;

  enableGQL(): TableBuilder;

  setGQLOption(option: Partial<GQLOption>): TableBuilder;
}

export class TableCreator implements TableBuilder {
  private readonly table: TableHandler;
  private readonly columns: ColumnBuilder[] = [];

  constructor(public tableName: string, store: DataStore) {
    this.table = new TableHandler({ tableName }, store);
  }

  column(name: string): ColumnCreator {
    if (this.table.hasColumn(name))
      throw new Error(`${this.tableName}.${name} already exists`);
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
      this.table.addColumn(
        new NormalColumn(data, this.table),
        isPrimary,
        isUnique,
      );
    });
    return this.table;
  }

  createdAt(): TableBuilder {
    this.column('createdAt').timestamp().defaultCurrentTimeStamp().notNull();
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
    this.table.addIndex(
      `index_${this.tableName}__${columns.join('_')}`,
      ...columns,
    );
    return this;
  }


  enableGQL(): TableBuilder {
    this.table.setGQLOption({
      ...this.table.gqlOption,
      enabled: true,
    });
    return this;
  }

  setGQLOption(option: Partial<GQLOption>): TableBuilder {
    this.table.setGQLOption(option);
    return this;
  }

  setGQLCreate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): TableBuilder {
    this.table.setGQLCreate(enabled, options);
    return this;
  }

  setGQLUpdate(
    enabled: boolean,
    options?: Partial<MutationOption>,
  ): TableBuilder {
    this.table.setGQLUpdate(enabled, options);
    return this;
  }

  setGQLDelete(
    enabled: boolean,
    options?: Partial<Omit<MutationOption, 'noReFetch'>>,
  ): TableBuilder {
    this.table.setGQLDelete(enabled, options);
    return this;
  }

  setGQLContextColumn(columns: GqlFromContextParam[]): TableBuilder {
    this.table.setGQLContextColumn(columns);
    return this;
  }
}
