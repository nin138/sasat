import { columnToSql } from './columnToSql';
import { Reference, SerializedNormalColumn } from '../../migration/serialized/serializedColumn';
import { ForeignKey } from '../../migration/data/foreignKey';

// export const foreignKeyToSql = (foreignKey: ForeignKey): string => {
//   const onUpdate = foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : '';
//   const onDelete = foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : '';
//   return (
//     `CONSTRAINT ${foreignKey.constraintName} ` +
//     `FOREIGN KEY(${foreignKey.columnName}) ` +
//     `REFERENCES ${foreignKey.referenceTable}(${foreignKey.referenceColumn})` +
//     onUpdate +
//     onDelete
//   );
// };

export const SqlCreator = {
  addColumn: (tableName: string, column: SerializedNormalColumn): string =>
    `ALTER TABLE ${tableName} ADD COLUMN ${columnToSql(column)}`,
  dropColumn: (tableName: string, columnName: string): string => `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`,
  addUniqueKey: (tableName: string, columns: string[]): string =>
    `ALTER TABLE ${tableName} ADD UNIQUE ${columns.join('__')}(${columns.join(',')})`,
  addPrimaryKey: (tableName: string, columns: string[]): string =>
    `ALTER TABLE ${tableName} ADD PRIMARY KEY ${columns.join('__')}(${columns.join(',')})`,
  addForeignKey: (tableName: string, constraintName: string, reference: Reference): string => {
    const onUpdate = reference.onUpdate ? ' ON UPDATE ' + reference.onUpdate : '';
    const onDelete = reference.onDelete ? ' ON DELETE ' + reference.onDelete : '';
    return `ALTER TABLE ${tableName} ADD CONSTRAINT '${constraintName}' FOREIGN KEY (${reference.columnName}) REFERENCES ${reference.targetTable}(${reference.targetColumn})${onUpdate}${onDelete}`;
  },
};
