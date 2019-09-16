import { AllColumnInfo } from "../../types/column";
import { Index } from "../../types";
import { ForeignKey } from "../../types/foreignKey";

export interface TableInfo {
  tableName: string;
  columns: AllColumnInfo[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
  primaryKey: string[] | undefined;
  uniqueKeys: string[][];
}
