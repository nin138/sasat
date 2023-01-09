import { Literal } from './dsl/query/query.js';
import { QExpr } from './dsl/factory.js';

export const dateOffset = (date: Date, timeZoneHour?: number): Date => {
  const offset = timeZoneHour
    ? timeZoneHour * 60 * 60 * 1000
    : date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + offset);
};

const zeroPad = (v: number, len: number) => v.toString().padStart(len, '0');

export const dateToDatetimeString = (d: Date) => {
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

export const dateToDateString = (d: Date) => {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  // YYYY-MM-DD
  return zeroPad(year, 4) + '-' + zeroPad(month, 2) + '-' + zeroPad(day, 2);
};

export const getTodayDateString = (timeZoneHour?: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return dateToDateString(dateOffset(date, timeZoneHour));
};

export const getTodayDateTimeString = (timeZoneHour?: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return dateToDatetimeString(dateOffset(date, timeZoneHour));
};

export const getDayRange = (
  date: Date,
  timeZoneHour?: number,
): [string, string] => {
  date.setHours(0, 0, 0, 0);
  const d = dateOffset(date, timeZoneHour || 0);
  const begin = dateToDatetimeString(d);
  d.setDate(d.getDate() + 1);
  return [begin, dateToDatetimeString(d)];
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
