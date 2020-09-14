import { SerializedColumn } from './serializedColumn';
import { Index } from '../data';
import { GqlOption } from '../data/gqlOption';

export interface SerializedStore {
  tables: SerializedTable[];
}

export interface SerializedTable {
  columns: SerializedColumn[];
  primaryKey: string[];
  uniqueKeys: string[][];
  indexes: Index[];
  tableName: string;
  gqlOption: GqlOption;
}
