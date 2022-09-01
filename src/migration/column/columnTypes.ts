export enum DBColumnTypes {
  char = 'char',
  varchar = 'varchar',
  text = 'text',
  tinyInt = 'tinyint',
  smallInt = 'smallint',
  mediumInt = 'mediumint',
  int = 'int',
  bigInt = 'bigint',
  float = 'float',
  double = 'double',
  decimal = 'decimal',
  year = 'year',
  date = 'date',
  time = 'time',
  dateTime = 'datetime',
  timestamp = 'timestamp',
  boolean = 'boolean',
}

export type DBType =
  | 'char'
  | 'varchar'
  | 'text'
  | 'tinyint'
  | 'smallint'
  | 'mediumint'
  | 'int'
  | 'bigint'
  | 'float'
  | 'double'
  | 'decimal'
  | 'year'
  | 'date'
  | 'time'
  | 'datetime'
  | 'timestamp'
  | 'boolean';

export type DBStringTypes = DBColumnTypes.char | DBColumnTypes.varchar;
export type DBTextTypes = DBColumnTypes.text;
export type DBIntegerTypes =
  | DBColumnTypes.tinyInt
  | DBColumnTypes.smallInt
  | DBColumnTypes.mediumInt
  | DBColumnTypes.int
  | DBColumnTypes.bigInt;

export type DBFloatingTypes = DBColumnTypes.float | DBColumnTypes.double;
export type DBNumberTypes =
  | DBIntegerTypes
  | DBFloatingTypes
  | DBColumnTypes.decimal;
export type DBDateTypes =
  | DBColumnTypes.time
  | DBColumnTypes.date
  | DBColumnTypes.year;

export const columnTypeToTsType = (type: DBColumnTypes): string => {
  switch (type) {
    case DBColumnTypes.tinyInt:
    case DBColumnTypes.smallInt:
    case DBColumnTypes.mediumInt:
    case DBColumnTypes.int:
    case DBColumnTypes.bigInt:
    case DBColumnTypes.float:
    case DBColumnTypes.double:
    case DBColumnTypes.decimal:
    case DBColumnTypes.year:
      return 'number';
    case DBColumnTypes.char:
    case DBColumnTypes.varchar:
    case DBColumnTypes.text:
    case DBColumnTypes.time:
    case DBColumnTypes.date:
    case DBColumnTypes.dateTime:
    case DBColumnTypes.timestamp:
      return 'string';
    case DBColumnTypes.boolean:
      return 'boolean';
  }
};
