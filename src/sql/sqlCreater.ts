import { Index } from '../entity';
import { ForeignKey } from '../entity/foreignKey';
import { columnToSql } from './columnToSql';
import { ColumnData } from '../migration/column/columnData';

export const foreignKeyToSql = (foreignKey: ForeignKey) => {
  const onUpdate = foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : '';
  const onDelete = foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : '';
  return (
    `CONSTRAINT ${foreignKey.constraintName} ` +
    `FOREIGN KEY(${foreignKey.columnName}) ` +
    `REFERENCES ${foreignKey.referenceTable}(${foreignKey.referenceColumn})` +
    onUpdate +
    onDelete
  );
};

export const addIndex = (tableName: string, index: Index) =>
  `ALTER TABLE ${tableName} ADD INDEX ${index.constraintName}(${index.columns.join(',')})`;

export const addColumn = (tableName: string, column: ColumnData) =>
  `ALTER TABLE ${tableName} ADD COLUMN ${columnToSql(column)}`;

export const addUniqueKey = (tableName: string, columns: string[]) =>
  `ALTER TABLE ${tableName} ADD UNIQUE ${columns.join('__')}(${columns.join(',')})`;

export const addPrimaryKey = (tableName: string, columns: string[]) =>
  `ALTER TABLE ${tableName} ADD PRIMARY KEY ${columns.join('__')}(${columns.join(',')})`;

export const addForeignKey = (tableName: string, foreignKey: ForeignKey) =>
  `ALTER TABLE ${tableName} ADD ${foreignKeyToSql(foreignKey)}`;
