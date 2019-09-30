import * as path from 'path';
import { writeFile } from 'fs-extra';
import { TableGenerator } from '../store';

const createEntityString = (table: TableGenerator): string => {
  const fields = table.columns
    .map(column => `  ${table.isPrimary(column.name) ? 'readonly ' : ''}${column.name}: ${column.getTsType()};`)
    .join('\n');
  return `export interface ${table.entityName()} extends Creatable${table.entityName()} {\n` + fields + '\n}';
};

const createCreatableEntityString = (table: TableGenerator): string => {
  const fields = table.columns
    .map(column => `  ${column.name}${column.isNullableOnCreate() ? '?' : ''}: ${column.getTsType()};`)
    .join('\n');
  return `export interface Creatable${table.entityName()} {\n` + fields + '\n}';
};

export const writeEntity = (table: TableGenerator, outDir: string) => {
  return writeFile(
    path.join(outDir, table.tableName + '.ts'),
    createEntityString(table) + '\n\n' + createCreatableEntityString(table) + '\n',
  );
};
