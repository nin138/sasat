import {
  BooleanColumnBuilder,
  ColumnBuilder,
  DateColumnBuilder,
  DecimalColumnBuilder,
  FloatColumnBuilder,
  IntegerColumnBuilder,
  StringColumnBuilder,
  TextColumnBuilder,
  TimeStampColumnBuilder,
} from './columnBuilder';
import { TableBase } from '../table/tableBase';
import { SasatColumnTypes } from './columnTypes';

export class ColumnCreator {
  constructor(private table: TableBase, private name: string, private callAddColumn = true) {}
  char = (length: number) => this.create(new StringColumnBuilder(this.name, SasatColumnTypes.char, length));
  varchar = (length: number) => this.create(new StringColumnBuilder(this.name, SasatColumnTypes.varchar, length));
  text = () => this.create(new TextColumnBuilder(this.name, SasatColumnTypes.text));
  tinyInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, SasatColumnTypes.tinyInt, length));
  smallInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, SasatColumnTypes.smallInt, length));
  mediumInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, SasatColumnTypes.mediumInt, length));
  int = (length?: number) => this.create(new IntegerColumnBuilder(this.name, SasatColumnTypes.int, length));
  bigInt = (length?: number) => this.create(new IntegerColumnBuilder(this.name, SasatColumnTypes.bigInt, length));
  float = (length?: number, scale?: number) =>
    this.create(new FloatColumnBuilder(this.name, SasatColumnTypes.float, length, scale));
  double = (length?: number, scale?: number) =>
    this.create(new FloatColumnBuilder(this.name, SasatColumnTypes.double, length, scale));
  decimal = (length?: number, scale?: number) =>
    this.create(new DecimalColumnBuilder(this.name, SasatColumnTypes.decimal, length, scale));
  year = () => this.create(new DateColumnBuilder(this.name, SasatColumnTypes.year));
  date = () => this.create(new DateColumnBuilder(this.name, SasatColumnTypes.date));
  time = () => this.create(new DateColumnBuilder(this.name, SasatColumnTypes.time));
  dateTime = () => this.create(new TimeStampColumnBuilder(this.name, SasatColumnTypes.dateTime));
  timestamp = () => this.create(new TimeStampColumnBuilder(this.name, SasatColumnTypes.timestamp));
  boolean = () => this.create(new BooleanColumnBuilder(this.name));

  private create<T extends ColumnBuilder>(column: T): T {
    if (this.callAddColumn) this.table.addBuiltInColumn(column);
    return column;
  }
}
