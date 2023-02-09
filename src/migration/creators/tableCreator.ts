import { ColumnCreator } from './columnCreator.js';
import {
  AutoIncrementIDColumnBuilder,
  ColumnBuilderBase,
  ReferenceColumnBuilder,
} from './columnBuilder.js';
import { NormalColumn, ReferenceColumn } from '../serializable/column.js';
import { Reference } from '../serialized/serializedColumn.js';
import { TableHandler } from '../serializable/table.js';
import {
  GqlFromContextParam,
  GQLMutation,
  GQLOption,
  GQLQuery,
  MutationOption,
} from '../data/GQLOption.js';
import { DataStore } from '../dataStore.js';
import { VirtualRelation } from '../data/virtualRelation.js';

export interface TableBuilder {
  autoIncrementHashId(
    columnName: string,
    option?: { salt?: string; bigint?: boolean },
  ): TableBuilder;
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

  enableGQL(): TableBuilder;

  setGQLOption(option: Partial<GQLOption>): TableBuilder;
  addGQLQuery(...query: GQLQuery[]): TableBuilder;
  addGQLMutation(...mutation: GQLMutation[]): TableBuilder;
}

export class TableCreator implements TableBuilder {
  private readonly table: TableHandler;
  private readonly columns: ColumnBuilderBase[] = [];

  constructor(public tableName: string, protected readonly store: DataStore) {
    this.table = new TableHandler({ tableName }, store);
  }

  autoIncrementHashId(
    columnName: string,
    option?: { salt?: string; bigint?: boolean },
  ): TableBuilder {
    this.addColumn(new AutoIncrementIDColumnBuilder(columnName, option));
    return this;
  }

  column(name: string): ColumnCreator {
    return new ColumnCreator(this, name);
  }

  addVirtualRelation(relation: Omit<VirtualRelation, 'childTable'>) {
    this.table.addVirtualRelation(relation);
    return this;
  }

  addColumn(column: ColumnBuilderBase): void {
    if (this.table.hasColumn(column.columnName))
      throw new Error(`${this.tableName}.${column.columnName} already exists`);
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
  addGQLQuery(...query: GQLQuery[]): TableBuilder {
    this.table.setGQLOption({
      queries: [...this.table.gqlOption.queries, ...query],
    });
    return this;
  }
  addGQLMutation(...mutation: GQLMutation[]): TableBuilder {
    this.table.setGQLOption({
      mutations: [...this.table.gqlOption.mutations, ...mutation],
    });
    return this;
  }
}
