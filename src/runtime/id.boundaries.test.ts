import { GraphQLError } from "graphql";
import Hashids from "hashids";
import { makeBigIntIdEncoder, makeNumberIdEncoder } from "./id.js";

const hash = new Hashids("boundaries");
const small = makeNumberIdEncoder(hash);
const large = makeBigIntIdEncoder(hash);
for (const [name, encoder] of [
  ["number", small],
  ["bigint", large],
] as const) {
  test.each([
    "",
    "!",
    "not a hash",
    hash.encode(1, 2),
    new Hashids("other").encode(42),
    12,
    {},
    false,
  ])(
    name + " rejects invalid Hash ID %p with a stable sanitized error",
    (value) => {
      let error: unknown;
      try {
        encoder.decode(value as string);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error).toMatchObject({
        message: "Invalid Hash ID",
        extensions: { code: "BAD_USER_INPUT" },
      });
    },
  );
  test(name + " preserves null and undefined for input and output", () => {
    expect(encoder.decode(null)).toBeNull();
    expect(encoder.decode(undefined)).toBeUndefined();
    expect(encoder.encode(null)).toBeNull();
    expect(encoder.encode(undefined)).toBeUndefined();
  });
}
test.each([
  0n,
  1n,
  9007199254740991n,
  9007199254740993n,
  18446744073709551615n,
])("bigint round trips %s", (value) => {
  expect(large.decode(large.encode(value))).toBe(value);
});
test("number decoder never returns bigint or silently rounds an oversized ID", () => {
  expect(small.decode(hash.encode(Number.MAX_SAFE_INTEGER))).toBe(
    Number.MAX_SAFE_INTEGER,
  );
  expect(() => small.decode(hash.encode(9007199254740993n))).toThrow(
    "Invalid Hash ID",
  );
});
test.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1", 1n])(
  "number encoder rejects %p",
  (value) => {
    expect(() => small.encode(value as number)).toThrow("Invalid Hash ID");
  },
);
test.each([-1n, 1, "1", NaN])("bigint encoder rejects %p", (value) => {
  expect(() => large.encode(value as bigint)).toThrow("Invalid Hash ID");
});
