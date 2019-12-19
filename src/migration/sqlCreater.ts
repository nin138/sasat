import * as SqlString from 'sqlstring';
import { DBColumnTypes } from './column/columnTypes';
import { AllColumnInfo } from '../v2/column';
import { Index } from './table';
import { ForeignKey } from './table/foreignKey';

export const columnToSql = (column: AllColumnInfo) => {
  // TODO impl type boolean
  const structure = [column.columnName, column.type];
  if (column.length) structure.push(`(${[column.length, column.scale].filter(it => it !== undefined).join(',')})`);
  if (column.signed === true) structure.push('SIGNED');
  else if (column.signed === false) structure.push('UNSIGNED');
  if (column.zerofill) structure.push('ZEROFILL');
  if (column.autoIncrement) structure.push('AUTO_INCREMENT');
  if (column.notNull === true) structure.push('NOT NULL');
  else if (column.notNull === false) structure.push('NULL');
  if (column.unique) structure.push('UNIQUE');
  if (
    (column.type === DBColumnTypes.timestamp || column.type === DBColumnTypes.dateTime) &&
    column.default === 'CURRENT_TIMESTAMP'
  )
    structure.push('DEFAULT CURRENT_TIMESTAMP');
  else if (column.default !== undefined) structure.push('DEFAULT ' + SqlString.escape(column.default));
  if (column.onUpdateCurrentTimeStamp) structure.push('ON UPDATE CURRENT_TIMESTAMP');
  return structure.join(' ');
};

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

export const addColumn = (tableName: string, column: AllColumnInfo) =>
  `ALTER TABLE ${tableName} ADD COLUMN ${columnToSql(column)}`;

export const addUniqueKey = (tableName: string, columns: string[]) =>
  `ALTER TABLE ${tableName} ADD UNIQUE ${columns.join('__')}(${columns.join(',')})`;

export const addPrimaryKey = (tableName: string, columns: string[]) =>
  `ALTER TABLE ${tableName} ADD PRIMARY KEY ${columns.join('__')}(${columns.join(',')})`;

export const addForeignKey = (tableName: string, foreignKey: ForeignKey) =>
  `ALTER TABLE ${tableName} ADD ${foreignKeyToSql(foreignKey)}`;
