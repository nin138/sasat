import { GqlOption } from '../gqlOption';
import { SerializedColumn } from './serializedColumn';
import { Index } from '../serializable';

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
