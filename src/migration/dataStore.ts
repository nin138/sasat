import type { VirtualRelation } from "./data/virtualRelation.js";
import type { ReferenceColumn } from "./serializable/column.js";
import { type Table, TableHandler } from "./serializable/table.js";
import type { SerializedStore } from "./serialized/serializedStore.js";

export interface DataStore {
  table(tableName: string): Table;
}

export class DataStoreHandler implements DataStore {
  tables: TableHandler[];
  constructor(store: SerializedStore) {
    this.tables = store.tables.map((it) => new TableHandler(it, this));
  }
  table(tableName: string): TableHandler {
    const table = this.tables.find((it) => it.tableName === tableName);
    if (!table) throw new Error(`Table: ${tableName} is Not Found`);
    return table;
  }

  referencedBy(tableName: string): ReferenceColumn[] {
    return this.tables.flatMap(
      (it) =>
        it.columns.filter(
          (it) =>
            it.isReference() && it.data.reference.parentTable === tableName,
        ) as ReferenceColumn[],
    );
  }

  virtualReferencedBy(tableName: string): VirtualRelation[] {
    return this.tables.flatMap((it) =>
      it.virtualRelations.filter((it) => it.parentTable === tableName),
    );
  }
}
