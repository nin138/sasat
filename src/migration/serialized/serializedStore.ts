import type { GQLOption } from '../data/GQLOption.js';
import type { Index } from '../data/index.js';
import type { VirtualRelation } from '../data/virtualRelation.js';
import type { SerializedColumn } from './serializedColumn.js';

export interface SerializedStore {
  tables: SerializedTable[];
}

export interface SerializedTable {
  columns: SerializedColumn[];
  primaryKey: string[];
  uniqueKeys: string[][];
  indexes: Index[];
  tableName: string;
  gqlOption: GQLOption;
  virtualRelations: VirtualRelation[];
}
