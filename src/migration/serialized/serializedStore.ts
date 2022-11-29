import { SerializedColumn } from './serializedColumn.js';
import { Index } from '../data/index.js';
import { GQLOption } from '../data/GQLOption.js';

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
}
