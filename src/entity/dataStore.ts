import { Table, TableHandler } from '../migration/serializable/table';
import { SerializedStore } from '../migration/serialized/serializedStore';
import { ReferenceColumn } from '../migration/serializable/column';

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
      .map(
        it => it.columns.find(it => it.isReference() && it.data.reference.targetTable === tableName) as ReferenceColumn,
      )
      .filter(it => it);
  }
}
