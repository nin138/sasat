import { ColumnInfo } from "./column";
import { ForeignKey } from "./foreignKey";

export interface Table {
  columns: ColumnInfo[];
  uniqueKey: string[][];
  indexes: string[];
  foreignKeys: ForeignKey[];
}
