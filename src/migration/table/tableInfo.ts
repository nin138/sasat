import { AllColumnInfo } from '../column/column';
import { Index } from './index';
import { ForeignKey } from './foreignKey';
import { ColumnReference } from '../column/referenceColumn';

export interface TableInfo {
  tableName: string;
  columns: Array<AllColumnInfo>;
  indexes: Index[];
  foreignKeys: ForeignKey[];
  primaryKey: string[];
  uniqueKeys: string[][];
  references: ColumnReference[];
}

export const isPrimary = (key: string, table: TableInfo) => table.primaryKey.includes(key);
