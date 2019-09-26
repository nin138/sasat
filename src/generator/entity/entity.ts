import { TableInfo } from '../../migration/table/tableInfo';
import { columnTypeToTsType } from '../../migration/column/columnTypes';
import { capitalizeFirstLetter, mkDirIfNotExists } from '../../util';
import * as path from 'path';
import { config } from '../../config/config';
import { emptyDir, writeFile } from 'fs-extra';
import { AllColumnInfo } from '../../migration/column/column';

const getColumnTsType = (column: AllColumnInfo) =>
  `${columnTypeToTsType(column.type)}${column.notNull === false ? ' | null' : ''}`;

export const getEntityName = (table: TableInfo) => capitalizeFirstLetter(table.tableName);

const createEntityString = (table: TableInfo): string => {
  const isPrimary = (column: AllColumnInfo) => table.primaryKey.includes(column.columnName);
  const fields = table.columns
    .map(column => `  ${isPrimary(column) ? 'readonly ' : ''}${column.columnName}: ${getColumnTsType(column)};`)
    .join('\n');
  return `export interface ${getEntityName(table)} extends Creatable${getEntityName(table)} {\n` + fields + '\n}';
};

const createCreatableEntityString = (table: TableInfo): string => {
  const isRequired = (column: AllColumnInfo) =>
    !(column.default !== undefined || column.autoIncrement || column.notNull === false);

  const fields = table.columns
    .map(column => `  ${column.columnName}${isRequired(column) ? '' : '?'}: ${getColumnTsType(column)};`)
    .join('\n');
  return `export interface Creatable${getEntityName(table)} {\n` + fields + '\n}';
};

export const writeEntityFiles = async (tables: TableInfo[]) => {
  const outDir = path.join(config().migration.out, '__generated', 'entity');
  mkDirIfNotExists(outDir);
  await emptyDir(outDir);
  return await Promise.all(
    tables.map(table =>
      writeFile(
        path.join(outDir, table.tableName + '.ts'),
        createEntityString(table) + '\n\n' + createCreatableEntityString(table) + '\n',
      ),
    ),
  );
};
