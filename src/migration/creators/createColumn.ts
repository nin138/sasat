import {
  DateColumnBuilder,
  DecimalColumnBuilder,
  FloatColumnBuilder,
  IntegerColumnBuilder,
  StringColumnBuilder,
  TextColumnBuilder,
  TimeStampColumnBuilder,
} from './columnBuilder.js';
import { DBColumnTypes } from '../column/columnTypes.js';

export type CreateColumn = {
  char: (length: number) => StringColumnBuilder;
  varchar: (length: number) => StringColumnBuilder;
  text: () => TextColumnBuilder;
  tinyInt: (length?: number) => IntegerColumnBuilder;
  smallInt: (length?: number) => IntegerColumnBuilder;
  mediumInt: (length?: number) => IntegerColumnBuilder;
  int: (length?: number) => IntegerColumnBuilder;
  bigInt: (length?: number) => IntegerColumnBuilder;
  float: (length?: number, scale?: number) => FloatColumnBuilder;
  double: (length?: number, scale?: number) => FloatColumnBuilder;
  decimal: (length?: number, scale?: number) => DecimalColumnBuilder;
  year: () => DateColumnBuilder;
  date: () => DateColumnBuilder;
  time: () => DateColumnBuilder;
  dateTime: () => TimeStampColumnBuilder;
  timestamp: () => TimeStampColumnBuilder;
};

export const createColumn = (name: string): CreateColumn =>
  ({
    char: (length: number): StringColumnBuilder =>
      new StringColumnBuilder(name, DBColumnTypes.char, length),
    varchar: (length: number): StringColumnBuilder =>
      new StringColumnBuilder(name, DBColumnTypes.varchar, length),
    text: (): TextColumnBuilder =>
      new TextColumnBuilder(name, DBColumnTypes.text),
    tinyInt: (length?: number): IntegerColumnBuilder =>
      new IntegerColumnBuilder(name, DBColumnTypes.tinyInt, length),
    smallInt: (length?: number): IntegerColumnBuilder =>
      new IntegerColumnBuilder(name, DBColumnTypes.smallInt, length),
    mediumInt: (length?: number): IntegerColumnBuilder =>
      new IntegerColumnBuilder(name, DBColumnTypes.mediumInt, length),
    int: (length?: number): IntegerColumnBuilder =>
      new IntegerColumnBuilder(name, DBColumnTypes.int, length),
    bigInt: (length?: number): IntegerColumnBuilder =>
      new IntegerColumnBuilder(name, DBColumnTypes.bigInt, length),
    float: (length?: number, scale?: number): FloatColumnBuilder =>
      new FloatColumnBuilder(name, DBColumnTypes.float, length, scale),
    double: (length?: number, scale?: number): FloatColumnBuilder =>
      new FloatColumnBuilder(name, DBColumnTypes.double, length, scale),
    decimal: (length?: number, scale?: number): DecimalColumnBuilder =>
      new DecimalColumnBuilder(name, DBColumnTypes.decimal, length, scale),
    year: (): DateColumnBuilder =>
      new DateColumnBuilder(name, DBColumnTypes.year),
    date: (): DateColumnBuilder =>
      new DateColumnBuilder(name, DBColumnTypes.date),
    time: (): DateColumnBuilder =>
      new DateColumnBuilder(name, DBColumnTypes.time),
    dateTime: (): TimeStampColumnBuilder =>
      new TimeStampColumnBuilder(name, DBColumnTypes.dateTime),
    timestamp: (): TimeStampColumnBuilder =>
      new TimeStampColumnBuilder(name, DBColumnTypes.timestamp),
  } as const);
