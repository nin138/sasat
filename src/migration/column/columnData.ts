import {
  SasatColumnTypes,
  SasatDateTypes,
  SasatFloatingTypes,
  SasatIntegerTypes,
  SasatStringTypes,
  SasatTextTypes,
} from './columnTypes';
import { SqlValueType } from '../../db/dbClient';

export interface ColumnBase {
  columnName: string;
  type: SasatColumnTypes;
  notNull: boolean;
  default: SqlValueType | undefined;
}

export interface StringColumn extends ColumnBase {
  type: SasatStringTypes;
  length: number;
  default: string | null | undefined;
}

export interface TextColumn extends ColumnBase {
  type: SasatTextTypes;
  default: string | null | undefined;
}

export interface IntegerColumn extends ColumnBase {
  type: SasatIntegerTypes;
  zerofill: boolean;
  signed: boolean | undefined;
  autoIncrement: boolean;
  default: number | null | undefined;
  length: number | undefined;
}

export interface FloatColumn extends ColumnBase {
  type: SasatFloatingTypes;
  zerofill: boolean;
  signed: boolean;
  autoIncrement: boolean;
  default: number | null | undefined;
  length: number | undefined;
  scale: number | undefined;
}

export interface DecimalColumn extends ColumnBase {
  type: SasatColumnTypes.decimal;
  zerofill: boolean;
  signed: boolean;
  default: number | null | undefined;
  length: number | undefined;
  scale: number | undefined;
}

export type NumberColumn = IntegerColumn | FloatColumn | DecimalColumn;

export interface TimeStampColumn extends ColumnBase {
  type: SasatColumnTypes.timestamp | SasatColumnTypes.dateTime;
  default: 'CURRENT_TIMESTAMP' | string | null | undefined;
  onUpdateCurrentTimeStamp: boolean;
}

export interface DateColumn extends ColumnBase {
  type: SasatDateTypes;
  default: string | number | null | undefined;
}

export interface BooleanColumn extends ColumnBase {
  type: SasatColumnTypes.boolean;
  default: boolean | undefined;
}

export type ColumnData =
  | StringColumn
  | TextColumn
  | IntegerColumn
  | FloatColumn
  | DecimalColumn
  | TimeStampColumn
  | DateColumn
  | BooleanColumn;
