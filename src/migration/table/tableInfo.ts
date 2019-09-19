import { AllColumnInfo } from "../column/column";
import { Index } from "./index";
import { ForeignKey } from "./foreignKey";

export interface TableInfo {
  tableName: string;
  columns: AllColumnInfo[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
  primaryKey: string[] | undefined;
  uniqueKeys: string[][];
}
