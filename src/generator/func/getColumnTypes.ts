import { TableInfo } from '../../migration/table/tableInfo';
import { SasatColumnTypes } from '../../migration/column/columnTypes';

export const getColumnType = (tableName: string, columnName: string, tables: TableInfo[]): SasatColumnTypes => {
  const table = tables.find(it => it.tableName === tableName)!;
  const column = table.columns.find(it => it.columnName === columnName);
  if (column !== undefined) return column.type;
  return getColumnType(table.references.find(it => it.targetColumn === columnName)!.targetTable, columnName, tables);
};
