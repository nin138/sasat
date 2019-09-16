import { TableInfo } from "../../migration/table/tableInfo";
import { columnTypeToTsType } from "../../migration/column/columnTypes";
import { capitalizeFirstLetter } from "../../util";

export const genEntityString = (table: TableInfo): string => {
  const fields = table.columns
    .map(
      column =>
        `  ${column.columnName}: ${columnTypeToTsType(column.type)}${column.notNull === false ? " | null" : ""};`,
    )
    .join("\n");
  return `export interface ${capitalizeFirstLetter(table.tableName)}\n` + fields + "\n}";
};
