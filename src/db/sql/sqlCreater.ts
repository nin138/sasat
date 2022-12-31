import { columnToSql } from './columnToSql.js';
import {
  Reference,
  SerializedNormalColumn,
} from '../../migration/serialized/serializedColumn.js';

export const SqlCreator = {
  addColumn: (tableName: string, column: SerializedNormalColumn): string =>
    `ALTER TABLE ${tableName} ADD COLUMN ${columnToSql(column)}`,
  dropColumn: (tableName: string, columnName: string): string =>
    `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`,
  addUniqueKey: (tableName: string, columns: string[]): string =>
    `ALTER TABLE ${tableName} ADD UNIQUE ${columns.join('__')}(${columns.join(
      ',',
    )})`,
  addPrimaryKey: (tableName: string, columns: string[]): string =>
    `ALTER TABLE ${tableName} ADD PRIMARY KEY ${columns.join(
      '__',
    )}(${columns.join(',')})`,
  addForeignKey: (
    tableName: string,
    constraintName: string,
    reference: Reference,
  ): string => {
    const onUpdate = reference.onUpdate
      ? ' ON UPDATE ' + reference.onUpdate
      : '';
    const onDelete = reference.onDelete
      ? ' ON DELETE ' + reference.onDelete
      : '';
    return `ALTER TABLE ${tableName} ADD CONSTRAINT '${constraintName}' FOREIGN KEY (${reference.columnName}) REFERENCES ${reference.parentTable}(${reference.parentColumn})${onUpdate}${onDelete}`;
  },
};
