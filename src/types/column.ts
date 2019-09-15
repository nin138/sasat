import { ForeignKey } from "./foreignKey";

export enum SasatColumnTypes {
  char = "char",
  varchar = "varchar",
  text = "text",
  tinyInt = "tinyint",
  smallInt = "smallint",
  mediumInt = "mediumint",
  int = "int",
  bigInt = "bigint",
  float = "float",
  double = "double",
  decimal = "decimal",
  year = "year",
  date = "date",
  time = "time",
  dateTime = "datetime",
  timestamp = "timestamp",
  boolean = "boolean",
  id = "id",
}

export type SasatStringTypes = SasatColumnTypes.char | SasatColumnTypes.varchar;

export type SasatTextTypes = SasatColumnTypes.text;

export type SasatIntegerTypes =
  | SasatColumnTypes.tinyInt
  | SasatColumnTypes.smallInt
  | SasatColumnTypes.mediumInt
  | SasatColumnTypes.int
  | SasatColumnTypes.bigInt;

export type SasatFloatingTypes = SasatColumnTypes.float | SasatColumnTypes.double;

export type SasatNumberTypes = SasatIntegerTypes | SasatFloatingTypes | SasatColumnTypes.decimal;

export type SasatDateTypes =
  | SasatColumnTypes.time
  | SasatColumnTypes.date
  | SasatColumnTypes.dateTime
  | SasatColumnTypes.year;

interface ColumnBase {
  columnName: string;
  type: SasatColumnTypes;
  notNull: boolean;
  unique: boolean;
  primary: boolean;
  default: any;
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
  length: number;
}

export interface FloatColumn extends ColumnBase {
  type: SasatFloatingTypes;
  zerofill: boolean;
  signed: boolean;
  autoIncrement: boolean;
  default: number | null | undefined;
  length: number;
  scale: number;
}

export interface DecimalColumn extends ColumnBase {
  type: SasatColumnTypes.decimal;
  zerofill: boolean;
  signed: boolean;
  default: number | null | undefined;
  length: number;
  scale: number;
}

export interface TimeStampColumn extends ColumnBase {
  type: SasatColumnTypes.timestamp;
  default: "CURRENT_TIMESTAMP" | string | null | undefined;
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

export interface IdColumn extends ColumnBase {
  type: SasatColumnTypes.id;
  default: undefined | undefined;
}

export type ColumnInfo =
  | StringColumn
  | TextColumn
  | IntegerColumn
  | FloatColumn
  | DecimalColumn
  | TimeStampColumn
  | DateColumn
  | BooleanColumn
  | IdColumn;

export interface AllColumnInfo {
  columnName: string;
  type: SasatColumnTypes;
  length: number | undefined;
  scale: number | undefined;
  primary: boolean;
  notNull: boolean | undefined;
  unique: boolean;
  foreignKey: ForeignKey | undefined;
  zerofill: boolean;
  signed: boolean | undefined;
  autoIncrement: boolean;
  default: any;
  onUpdateCurrentTimeStamp: boolean;
}
