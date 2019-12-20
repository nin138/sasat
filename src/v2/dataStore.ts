import { Table } from './table';

export interface DataStore {
  table(tableName: string): Table | undefined;
}

export class DataStoreManagerHandler implements DataStore {
  tables: Table[] = [];
  table(tableName: string): Table | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }
}
