import {
  ColumnBuilder,
  DateColumnBuilder,
  DecimalColumnBuilder,
  FloatColumnBuilder,
  IntegerColumnBuilder,
  StringColumnBuilder,
  TextColumnBuilder,
  TimeStampColumnBuilder,
} from './columnBuilder';
import { TableCreator } from './tableCreator';
import { DBColumnTypes } from '../column/columnTypes';

export class ColumnCreator {
  constructor(private table: TableCreator, private name: string) {}
  char = (length: number): StringColumnBuilder =>
    this.create(new StringColumnBuilder(this.name, DBColumnTypes.char, length));
  varchar = (length: number): StringColumnBuilder =>
    this.create(new StringColumnBuilder(this.name, DBColumnTypes.varchar, length));
  text = (): TextColumnBuilder => this.create(new TextColumnBuilder(this.name, DBColumnTypes.text));
  tinyInt = (length?: number): IntegerColumnBuilder =>
    this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.tinyInt, length));
  smallInt = (length?: number): IntegerColumnBuilder =>
    this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.smallInt, length));
  mediumInt = (length?: number): IntegerColumnBuilder =>
    this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.mediumInt, length));
  int = (length?: number): IntegerColumnBuilder =>
    this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.int, length));
  bigInt = (length?: number): IntegerColumnBuilder =>
    this.create(new IntegerColumnBuilder(this.name, DBColumnTypes.bigInt, length));
  float = (length?: number, scale?: number): FloatColumnBuilder =>
    this.create(new FloatColumnBuilder(this.name, DBColumnTypes.float, length, scale));
  double = (length?: number, scale?: number): FloatColumnBuilder =>
    this.create(new FloatColumnBuilder(this.name, DBColumnTypes.double, length, scale));
  decimal = (length?: number, scale?: number): DecimalColumnBuilder =>
    this.create(new DecimalColumnBuilder(this.name, DBColumnTypes.decimal, length, scale));
  year = (): DateColumnBuilder => this.create(new DateColumnBuilder(this.name, DBColumnTypes.year));
  date = (): DateColumnBuilder => this.create(new DateColumnBuilder(this.name, DBColumnTypes.date));
  time = (): DateColumnBuilder => this.create(new DateColumnBuilder(this.name, DBColumnTypes.time));
  dateTime = (): TimeStampColumnBuilder => this.create(new TimeStampColumnBuilder(this.name, DBColumnTypes.dateTime));
  timestamp = (): TimeStampColumnBuilder => this.create(new TimeStampColumnBuilder(this.name, DBColumnTypes.timestamp));
  // boolean = () => this.create(new BooleanColumnBuilder(this.name));

  private create<T extends ColumnBuilder>(column: T): T {
    this.table.addColumn(column);
    return column;
  }
}
