import { DBColumnTypes } from '../migration/column/columnTypes';
import * as SqlString from 'sqlstring';
import { ColumnData } from '../migration/column/columnData';
import { escapeName } from './escape';

export const columnToSql = (column: ColumnData): string => {
  const words = [escapeName(column.columnName), column.type];
  if (column.length) words.push(`(${[column.length, column.scale].filter(it => it !== undefined).join(',')})`);
  if (column.signed === true) words.push('SIGNED');
  else if (column.signed === false) words.push('UNSIGNED');
  if (column.zerofill) words.push('ZEROFILL');
  if (column.autoIncrement) words.push('AUTO_INCREMENT');
  if (column.notNull) words.push('NOT NULL');
  else if (!column.notNull) words.push('NULL');
  if (
    (column.type === DBColumnTypes.timestamp || column.type === DBColumnTypes.dateTime) &&
    column.default === 'CURRENT_TIMESTAMP'
  )
    words.push('DEFAULT CURRENT_TIMESTAMP');
  else if (column.default !== undefined) words.push('DEFAULT ' + SqlString.escape(column.default));
  if (column.onUpdateCurrentTimeStamp) words.push('ON UPDATE CURRENT_TIMESTAMP');
  return words.join(' ');
};
