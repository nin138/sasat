import { ColumnCreator } from './columnCreator.js';
import { ColumnBuilderBase, ReferenceColumnBuilder } from './columnBuilder.js';
import { NormalColumn, ReferenceColumn } from '../serializable/column.js';
import { Reference } from '../serialized/serializedColumn.js';
import { TableHandler } from '../serializable/table.js';
import {
  GqlFromContextParam,
  GQLOption,
  GQLQuery,
  MutationOption,
} from '../data/GQLOption.js';
import { DataStore } from '../dataStore.js';
import { VirtualRelation } from '../data/virtualRelation.js';

export interface TableBuilder {
  column(columnName: string): ColumnCreator;

  addVirtualRelation(
    relation: Omit<VirtualRelation, 'childTable'>,
  ): TableBuilder;

  references(reference: Reference, notNull?: boolean): ColumnBuilderBase;

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
  addQuery(query: GQLQuery): TableBuilder;
}

export class TableCreator implements TableBuilder {
  private readonly table: TableHandler;
  private readonly columns: ColumnBuilderBase[] = [];

  constructor(public tableName: string, protected readonly store: DataStore) {
    this.table = new TableHandler({ tableName }, store);
  }

  column(name: string): ColumnCreator {
    if (this.table.hasColumn(name))
      throw new Error(`${this.tableName}.${name} already exists`);
    return new ColumnCreator(this, name);
  }

  addVirtualRelation(relation: Omit<VirtualRelation, 'childTable'>) {
    this.table.addVirtualRelation(relation);
    return this;
  }

  addColumn(column: ColumnBuilderBase): void {
    this.columns.push(column);
  }

  addUniqueKey(...columnNames: string[]): TableBuilder {
    this.table.addUniqueKey(...columnNames);
    return this;
  }
  references(ref: Reference): ReferenceColumnBuilder {
    const column = new ReferenceColumnBuilder(
      ref,
      this.store.table(ref.parentTable).column(ref.parentColumn),
    );
    this.addColumn(column);
    return column;
  }

  setPrimaryKey(...columnNames: string[]): TableBuilder {
    this.table.setPrimaryKey(...columnNames);
    return this;
  }

  create(): TableHandler {
    this.columns.forEach(column => {
      const { data, isPrimary, isUnique } = column.build();
      this.table.addColumn(
        data.hasReference
          ? new ReferenceColumn(data, this.table)
          : new NormalColumn(data, this.table),
        isPrimary,
        isUnique,
      );
    });
    return this.table;
  }

  createdAt(): TableBuilder {
    this.column('createdAt')
      .timestamp()
      .defaultCurrentTimeStamp()
      .notNull()
      .updatable(false);
    return this;
  }

  updatedAt(): TableBuilder {
    this.column('updatedAt')
      .timestamp()
      .defaultCurrentTimeStamp()
      .onUpdateCurrentTimeStamp()
      .notNull()
      .updatable(false);
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

  addQuery(query: GQLQuery): TableBuilder {
    this.table.setGQLOption({
      queries: [...this.table.gqlOption.queries, query],
    });
    return this;
  }
}
