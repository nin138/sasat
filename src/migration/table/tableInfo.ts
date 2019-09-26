import { AllColumnInfo } from '../column/column';
import { Index } from './index';
import { ForeignKey } from './foreignKey';
import { ReferenceColumnInfo } from '../column/referenceColumn';

export interface TableInfo {
  tableName: string;
  columns: Array<AllColumnInfo>;
  indexes: Index[];
  foreignKeys: ForeignKey[];
  primaryKey: string[];
  uniqueKeys: string[][];
  references: ReferenceColumnInfo[];
}
