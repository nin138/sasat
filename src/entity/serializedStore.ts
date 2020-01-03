import { Index } from './index';
import { ColumnData } from '../migration/column/columnData';
import { ReferenceColumnData } from './referenceColumn';
import { GqlOption } from '../migration/gqlOption';

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

export type SerializedColumn = ColumnData | ReferenceColumnData;
