import { Index } from '../migration/table';
import { ColumnData } from '../migration/column/columnData';
import { ReferenceColumnData } from './referenceColumn';

export interface SerializedStore {
  tables: SerializedTable[];
}

export interface SerializedTable {
  columns: SerializedColumn[];
  primaryKey: string[];
  uniqueKeys: string[][];
  indexes: Index[];
  tableName: string;
}

export type SerializedColumn = ColumnData | ReferenceColumnData;
