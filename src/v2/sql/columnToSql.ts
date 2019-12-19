import { NormalColumn } from '../column';
import { DBColumnTypes } from '../../migration/column/columnTypes';
import * as SqlString from 'sqlstring';

export const columnToSql = (column: NormalColumn) => {
  const words = [column.name, column.sqlType()];
  if (column.data.length)
    words.push(`(${[column.data.length, column.data.scale].filter(it => it !== undefined).join(',')})`);
  if (column.data.signed === true) words.push('SIGNED');
  else if (column.data.signed === false) words.push('UNSIGNED');
  if (column.data.zerofill) words.push('ZEROFILL');
  if (column.data.autoIncrement) words.push('AUTO_INCREMENT');
  if (column.data.notNull) words.push('NOT NULL');
  else if (!column.data.notNull) words.push('NULL');
  if (
    (column.sqlType() === DBColumnTypes.timestamp || column.sqlType() === DBColumnTypes.dateTime) &&
    column.data.default === 'CURRENT_TIMESTAMP'
  )
    words.push('DEFAULT CURRENT_TIMESTAMP');
  else if (column.data.default !== undefined) words.push('DEFAULT ' + SqlString.escape(column.data.default));
  if (column.data.onUpdateCurrentTimeStamp) words.push('ON UPDATE CURRENT_TIMESTAMP');
  return words.join(' ');
};
