import { Table, TableHandler } from './table';
import { SerializedStore } from './serializedStore';
import { ReferenceColumn } from './referenceColumn';

export interface DataStore {
  table(tableName: string): Table | undefined;
}

export class DataStoreHandler implements DataStore {
  tables: TableHandler[];
  constructor(store: SerializedStore) {
    this.tables = store.tables.map(it => new TableHandler(it, this));
  }
  table(tableName: string): Table | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }

  referencedBy(tableName: string): ReferenceColumn[] {
    return this.tables
      .map(it => it.columns.find(it => it.isReference() && it.data.targetTable === tableName) as ReferenceColumn)
      .filter(it => it);
  }
}
