import { DBColumnTypes } from '../../migration/column/columnTypes';
import { SqlString } from '../../runtime/sql/sqlString';
import { SerializedColumn } from '../../migration/serialized/serializedColumn';

export const columnToSql = (column: SerializedColumn): string => {
  const words = [SqlString.escapeId(column.columnName), column.type];
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
