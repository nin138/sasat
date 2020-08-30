import { DBColumnTypes, DBDateTypes, DBFloatingTypes, DBIntegerTypes, DBStringTypes, DBTextTypes } from './columnTypes';
import { SqlValueType } from '../../db/dbClient';

export interface ColumnData {
  columnName: string;
  type: DBColumnTypes;
  notNull: boolean;
  default: SqlValueType | undefined;
  zerofill: boolean;
  signed: boolean | undefined;
  autoIncrement: boolean;
  length: number | undefined;
  scale: number | undefined;
  defaultCurrentTimeStamp: boolean;
  onUpdateCurrentTimeStamp: boolean;
}

export interface ColumnBase {
  columnName: string;
  type: DBColumnTypes;
  notNull: boolean;
  default: SqlValueType | undefined;
}

export interface StringColumn extends ColumnBase {
  type: DBStringTypes;
  length: number;
  default: string | null | undefined;
}

export interface TextColumn extends ColumnBase {
  type: DBTextTypes;
  default: string | null | undefined;
}

export interface IntegerColumn extends ColumnBase {
  type: DBIntegerTypes;
  zerofill: boolean;
  signed: boolean | undefined;
  autoIncrement: boolean;
  default: number | null | undefined;
  length: number | undefined;
}

export interface FloatColumn extends ColumnBase {
  type: DBFloatingTypes;
  zerofill: boolean;
  signed: boolean;
  autoIncrement: boolean;
  default: number | null | undefined;
  length: number | undefined;
  scale: number | undefined;
}

export interface DecimalColumn extends ColumnBase {
  type: DBColumnTypes.decimal;
  zerofill: boolean;
  signed: boolean;
  default: number | null | undefined;
  length: number | undefined;
  scale: number | undefined;
}

export type NumberColumn = IntegerColumn | FloatColumn | DecimalColumn;

export interface TimeStampColumn extends ColumnBase {
  type: DBColumnTypes.timestamp | DBColumnTypes.dateTime;
  default: 'CURRENT_TIMESTAMP' | string | null | undefined;
  onUpdateCurrentTimeStamp: boolean;
}

export interface DateColumn extends ColumnBase {
  type: DBDateTypes;
  default: string | number | null | undefined;
}

export interface BooleanColumn extends ColumnBase {
  type: DBColumnTypes.boolean;
  default: boolean | undefined;
}
