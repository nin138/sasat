export enum SasatColumnTypes {
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
export type SasatDateTypes = SasatColumnTypes.time | SasatColumnTypes.date | SasatColumnTypes.year;

export const columnTypeToTsType = (type: SasatColumnTypes): string => {
  switch (type) {
    case SasatColumnTypes.tinyInt:
    case SasatColumnTypes.smallInt:
    case SasatColumnTypes.mediumInt:
    case SasatColumnTypes.int:
    case SasatColumnTypes.bigInt:
    case SasatColumnTypes.float:
    case SasatColumnTypes.double:
    case SasatColumnTypes.decimal:
    case SasatColumnTypes.year:
      return 'number';
    case SasatColumnTypes.char:
    case SasatColumnTypes.varchar:
    case SasatColumnTypes.text:
    case SasatColumnTypes.time:
      return 'string';
    case SasatColumnTypes.date:
    case SasatColumnTypes.dateTime:
    case SasatColumnTypes.timestamp:
      return 'Date';
    case SasatColumnTypes.boolean:
      return 'boolean';
  }
};
