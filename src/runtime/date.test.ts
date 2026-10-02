import {
  dateOffset,
  dateToDateString,
  dateToDatetimeString,
  getDayRange,
  getDayRangeQExpr,
} from "./date.js";
import { QExpr } from "./dsl/factory.js";

test("formats UTC values with milliseconds and leap dates", () => {
  const date = new Date("2024-02-29T03:04:05.006Z");
  expect(dateToDateString(date)).toBe("2024-02-29");
  expect(dateToDatetimeString(date)).toBe("2024-02-29 03:04:05.006");
});

test("applies positive and negative offsets without changing the original", () => {
  const date = new Date("2024-12-31T23:00:00Z");
  expect(dateOffset(date, 9).toISOString()).toBe("2025-01-01T08:00:00.000Z");
  expect(dateOffset(date, -5).toISOString()).toBe("2024-12-31T18:00:00.000Z");
  expect(date.toISOString()).toBe("2024-12-31T23:00:00.000Z");
});

test("accepts an explicit UTC offset even when the local zone differs", () => {
  const date = new Date("2024-01-01T00:00:00Z");
  jest.spyOn(date, "getTimezoneOffset").mockReturnValue(-540);
  expect(dateOffset(date, 0).getTime()).toBe(date.getTime());
  expect(dateOffset(date).getTime()).toBe(date.getTime() - 540 * 60000);
});

test("returns a half-open day range across a year boundary", () => {
  const date = new Date(2024, 11, 31, 12);
  const range = getDayRange(date);
  expect(range).toEqual(["2024-12-31 00:00:00.000", "2025-01-01 00:00:00.000"]);
  expect(getDayRangeQExpr(new Date(2024, 11, 31, 12))).toEqual(
    range.map(QExpr.value),
  );
});

test("distinguishes an omitted day-range offset from explicit UTC", () => {
  const local = new Date("2024-01-02T12:00:00Z");
  const utc = new Date(local);
  jest.spyOn(local, "getTimezoneOffset").mockReturnValue(-540);
  jest.spyOn(utc, "getTimezoneOffset").mockReturnValue(-540);
  expect(getDayRange(local)[0]).toBe("2024-01-01 15:00:00.000");
  expect(getDayRange(utc, 0)[0]).toBe("2024-01-02 00:00:00.000");
});
