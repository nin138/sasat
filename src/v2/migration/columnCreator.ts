import { DBColumnTypes } from '../../migration/column/columnTypes';
import {
  ColumnBuilder,
  DateColumnBuilder,
  DecimalColumnBuilder,
  FloatColumnBuilder,
  IntegerColumnBuilder,
  StringColumnBuilder,
  TextColumnBuilder,
  TimeStampColumnBuilder,
} from '../../migration/column/columnBuilder';
import { TableCreator } from './tableCreator';

export class ColumnCreator {
  constructor(private table: TableCreator, private name: string) {}
  char = (length: number) => this.create(new StringColumnBuilder(this.name, DBColumnTypes.char, length));
  varchar = (length: number) => this.create(new StringColumnBuilder(this.name, DBColumnTypes.varchar, length));
  text = () => this.create(new TextColumnBuilder(this.name, DBColumnTypes.text));
  tinyInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.tinyInt, length));
  smallInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.smallInt, length));
  mediumInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.mediumInt, length));
  int = (length?: number) => this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.int, length));
  bigInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.bigInt, length));
  float = (length?: number, scale?: number) =>
    this.create(new FloatColumnBuilder(this.name, DBColumnTypes.float, length, scale));
  double = (length?: number, scale?: number) =>
    this.create(new FloatColumnBuilder(this.name, DBColumnTypes.double, length, scale));
  decimal = (length?: number, scale?: number) =>
    this.create(new DecimalColumnBuilder(this.name, DBColumnTypes.decimal, length, scale));
  year = () => this.create(new DateColumnBuilder(this.name, DBColumnTypes.year));
  date = () => this.create(new DateColumnBuilder(this.name, DBColumnTypes.date));
  time = () => this.create(new DateColumnBuilder(this.name, DBColumnTypes.time));
  dateTime = () => this.create(new TimeStampColumnBuilder(this.name, DBColumnTypes.dateTime));
  timestamp = () => this.create(new TimeStampColumnBuilder(this.name, DBColumnTypes.timestamp));
  // boolean = () => this.create(new BooleanColumnBuilder(this.name));

  private create<T extends ColumnBuilder>(column: T): T {
    this.table.addColumn(column);
    return column;
  }
}
