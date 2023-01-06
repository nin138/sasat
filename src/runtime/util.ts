import { QExpr } from './dsl/factory.js';
import { Literal } from './dsl/query/query.js';

export const pick = <T extends object>(target: T, keys: Array<keyof T>) =>
  Object.fromEntries(keys.map(key => [key, target[key]]));

export const unique = <T>(array: T[]): T[] => {
  const result: T[] = [];
  for (let i = 0, l = array.length; i < l; i += 1) {
    if (!result.includes(array[i])) {
      result.push(array[i]);
    }
  }
  return result;
};

export const nonNullable = <T>(value: T): value is NonNullable<T> =>
  value != null;

export const dateOffset = (date: Date, timeZoneHour?: number): Date => {
  const offset = timeZoneHour
    ? timeZoneHour * 60 * 60 * 1000
    : date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + offset);
};

const zeroPad = (v: number, len: number) => v.toString().padStart(len, '0');

export const dateToString = (d: Date) => {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();
  const millisecond = d.getUTCMilliseconds();

  // YYYY-MM-DD HH:mm:ss.mmm
  return (
    zeroPad(year, 4) +
    '-' +
    zeroPad(month, 2) +
    '-' +
    zeroPad(day, 2) +
    ' ' +
    zeroPad(hour, 2) +
    ':' +
    zeroPad(minute, 2) +
    ':' +
    zeroPad(second, 2) +
    '.' +
    zeroPad(millisecond, 3)
  );
};

const getDateString = (d: Date) => {
  return (
    zeroPad(d.getUTCFullYear(), 4) +
    '-' +
    zeroPad(d.getUTCMonth() + 1, 2) +
    '-' +
    zeroPad(d.getUTCDate(), 2) +
    ' ' +
    0 +
    ':' +
    0 +
    ':' +
    0
  );
};

export const getDayRange = (
  date: Date,
  timeZoneHour?: number,
): [string, string] => {
  const d = dateOffset(date, timeZoneHour);
  const begin = getDateString(d);
  d.setDate(d.getDate() + 1);
  return [begin, getDateString(d)];
};

export const getDayRangeQExpr = (
  date: Date,
  timeZoneHour?: number,
): [Literal, Literal] => {
  return getDayRange(date, timeZoneHour).map(QExpr.value) as unknown as [
    Literal,
    Literal,
  ];
};
