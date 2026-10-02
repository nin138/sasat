import { getCurrentDateTimeString } from "./dateUtil.js";

afterEach(() => jest.useRealTimers());

test.each([
  [new Date(2024, 0, 2, 3, 4, 5), "2024-01-02 03:04:05"],
  [new Date(2024, 10, 23, 14, 15, 16), "2024-11-23 14:15:16"],
])("formats the current local time", (now, expected) => {
  jest.useFakeTimers().setSystemTime(now);
  expect(getCurrentDateTimeString()).toBe(expected);
});
