import { GQLOption } from '../data/GQLOption.js';
import { Index } from '../data/index.js';
import { VirtualRelation } from '../data/virtualRelation.js';
import { SerializedColumn } from './serializedColumn.js';

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
