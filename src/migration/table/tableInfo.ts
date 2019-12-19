import { AllColumnInfo } from '../../v2/column';
import { Index } from './index';
import { ForeignKey } from './foreignKey';
import { ReferenceColumnData } from '../../v2/referenceColumn';

export interface TableInfo {
  tableName: string;
  columns: Array<AllColumnInfo>;
  indexes: Index[];
  foreignKeys: ForeignKey[];
  primaryKey: string[];
  uniqueKeys: string[][];
  references: ReferenceColumnData[];
}

export const isPrimary = (key: string, table: TableInfo) => table.primaryKey.includes(key);
