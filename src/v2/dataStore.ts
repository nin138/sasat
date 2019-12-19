import { Table } from './table';

export class DataStore {
  tables: Table[] = [];
  table(tableName: string): Table | undefined {
    return this.tables.find(it => it.tableName === tableName);
  }
}
