import { Table, TableHandler } from './table';
import { SerializedStore } from './serializedStore';

export interface DataStore {
  table(tableName: string): Table | undefined;
}

export class DataStoreHandler implements DataStore {
  tables: TableHandler[] = [];
  constructor(store: SerializedStore) {
    store.tables.map(it => new TableHandler(it, this));
  }
  table(tableName: string): Table | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }
}
