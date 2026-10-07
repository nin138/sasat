import { normalizeInsertId } from "./numeric.js";

test.each([
  [null, 0],
  [1, 1],
  [1n, 1n],
  ["9007199254740991", 9007199254740991],
  ["9007199254740992", 9007199254740992n],
  ["9007199254740993", 9007199254740993n],
  ["-9223372036854775808", -9223372036854775808n],
  ["-2", -2],
])("preserves exact driver ID %p", (input, expected) => {
  expect(normalizeInsertId(input)).toBe(expected);
});
test.each([9007199254740992, 1.5, NaN, Infinity, "1.5", "garbage", {}])(
  "rejects an inexact driver ID %p",
  (input) => {
    expect(() => normalizeInsertId(input)).toThrow("exact integer");
  },
);
