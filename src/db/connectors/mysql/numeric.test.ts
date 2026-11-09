import type { ConnectionOptions } from "mysql2/promise";
import { mysqlNumericOptions, normalizeMysqlResult } from "./numeric.js";

const cast = mysqlNumericOptions.typeCast as Exclude<
  ConnectionOptions["typeCast"],
  boolean | undefined
>;
function field(type: string, value: string | null = null) {
  return { type, string: jest.fn(() => value) } as unknown as Parameters<
    typeof cast
  >[0];
}

test.each(["9007199254740993", "-9223372036854775808", 42, 42n, null])(
  "decodes exact BIGINT %p using the driver's binary/text decoder",
  (value) => {
    const input = field("LONGLONG");
    const next = jest.fn(() => value);
    expect(cast(input, next)).toBe(value === null ? null : BigInt(value));
    expect(next).toHaveBeenCalledTimes(1);
    expect(input.string).not.toHaveBeenCalled();
  },
);
test.each([9007199254740992, 1.5, NaN, Infinity, undefined, {}, true])(
  "rejects inexact or invalid BIGINT decoding %p",
  (value) => {
    expect(() => cast(field("LONGLONG"), () => value)).toThrow("exact integer");
  },
);
test.each(["DECIMAL", "NEWDECIMAL"])(
  "preserves exact %s strings and null",
  (type) => {
    const value = "12345678901234567890.123456789";
    const next = jest.fn();
    expect(cast(field(type, value), next)).toBe(value);
    expect(cast(field(type), next)).toBeNull();
    expect(next).not.toHaveBeenCalled();
  },
);
test("leaves other column types to the driver and preserves row arrays", () => {
  const next = jest.fn(() => "unchanged");
  expect(cast(field("VAR_STRING"), next)).toBe("unchanged");
  const rows = [{ id: 42n, amount: "1.20" }];
  expect(normalizeMysqlResult(rows)).toBe(rows);
});
test.each([
  ["42", 42],
  ["9007199254740993", 9007199254740993n],
  [null, 0],
])(
  "normalizes command insert ID %p without mutating the driver result",
  (insertId, expected) => {
    const packet = Object.freeze({
      insertId,
      affectedRows: 2,
      changedRows: 1,
      warningStatus: 0,
    });
    expect(normalizeMysqlResult(packet)).toEqual({
      ...packet,
      insertId: expected,
    });
    expect(packet.insertId).toBe(insertId);
  },
);
