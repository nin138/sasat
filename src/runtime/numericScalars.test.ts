import { buildSchema, graphql, Kind } from "graphql";
import Hashids from "hashids";
import { createTypeDef } from "./createTypeDef.js";
import { makeBigIntIdEncoder } from "./id.js";
import {
  BigIntScalar,
  DecimalScalar,
  numericScalarResolvers,
} from "./numericScalars.js";

const typeDefs = {
  Query: {
    decimal: { return: "Decimal", args: [{ name: "value", type: "Decimal" }] },
    integer: { return: "BigInt", args: [{ name: "value", type: "BigInt" }] },
  },
};
function schema() {
  const schema = buildSchema(createTypeDef(typeDefs, {}));
  for (const [name, scalar] of Object.entries(numericScalarResolvers(typeDefs)))
    Object.assign(schema.getType(name)!, scalar.toConfig());
  return schema;
}

test("decimal and bigint preserve exact values through GraphQL literals, variables and JSON results", async () => {
  const rootValue = {
    decimal: ({ value }: { value: string }) => {
      expect(typeof value).toBe("string");
      return value;
    },
    integer: ({ value }: { value: bigint }) => {
      expect(typeof value).toBe("bigint");
      return value;
    },
  };
  const s = schema();
  const result = await graphql({
    schema: s,
    rootValue,
    source:
      "{ decimal(value: 12345678901234567890.1234567890) integer(value: 9223372036854775807) }",
  });
  expect(result.errors).toBeUndefined();
  expect(JSON.parse(JSON.stringify(result.data))).toEqual({
    decimal: "12345678901234567890.1234567890",
    integer: "9223372036854775807",
  });
  const variables = await graphql({
    schema: s,
    rootValue,
    source:
      "query($d: Decimal, $b: BigInt) { decimal(value: $d) integer(value: $b) }",
    variableValues: { d: "0.00000000000000000001", b: "-9223372036854775808" },
  });
  expect(variables.errors).toBeUndefined();
  expect(variables.data).toEqual({
    decimal: "0.00000000000000000001",
    integer: "-9223372036854775808",
  });
  expect(
    (
      await graphql({
        schema: s,
        source: "{ decimal integer }",
        rootValue: { decimal: null, integer: null },
      })
    ).data,
  ).toEqual({ decimal: null, integer: null });
});

test.each(["0", "-0.0000", "2147483648.01", "9007199254740993.0001"])(
  "Decimal preserves %s",
  (value) => {
    expect(DecimalScalar.parseValue(value)).toBe(value);
    expect(DecimalScalar.serialize(value)).toBe(value);
  },
);
test.each([
  1.25,
  1,
  NaN,
  Infinity,
  "NaN",
  "Infinity",
  "1e3",
  "",
  " 1.2",
  {},
  true,
])("Decimal rejects invalid or approximate input %p", (value) => {
  expect(() => DecimalScalar.parseValue(value)).toThrow();
  expect(() => DecimalScalar.serialize(value)).toThrow();
});
test.each([
  "0",
  "2147483647",
  "2147483648",
  "-2147483649",
  "9007199254740991",
  "9007199254740992",
  "9007199254740993",
  "9223372036854775807",
  "-9223372036854775808",
  "18446744073709551615",
])("BigInt preserves %s", (value) => {
  expect(BigIntScalar.parseValue(value)).toBe(BigInt(value));
  expect(BigIntScalar.serialize(BigInt(value))).toBe(value);
});
test.each([9007199254740992, 1.25, NaN, Infinity, "1.2", "1e3", "", {}, true])(
  "BigInt rejects invalid or unsafe input %p",
  (value) => {
    expect(() => BigIntScalar.parseValue(value)).toThrow();
    expect(() => BigIntScalar.serialize(value)).toThrow();
  },
);
test("safe numeric variables are accepted for BigInt, float literals are rejected", () => {
  expect(BigIntScalar.parseValue(2147483648)).toBe(2147483648n);
  expect(() =>
    BigIntScalar.parseLiteral({ kind: Kind.FLOAT, value: "1.0" }, {}),
  ).toThrow();
});
test("scalar registration includes input-only and argument-only types, and excludes unused scalars", () => {
  expect(
    numericScalarResolvers({ Query: { ok: { return: "Boolean!" } } }),
  ).toEqual({});
  const defs = {
    Query: {
      ok: { return: "Boolean", args: [{ name: "ids", type: "[BigInt!]!" }] },
    },
  };
  const inputs = { NewItem: { amount: { return: "Decimal!" } } };
  expect(Object.keys(numericScalarResolvers(defs, inputs))).toEqual([
    "Decimal",
    "BigInt",
  ]);
  expect(createTypeDef(defs, inputs)).toContain("scalar Decimal");
  expect(createTypeDef({}, {})).toBe("");
});
test.each([0n, 1n, 9007199254740993n, 18446744073709551615n])(
  "bigint hash ID round trips %s",
  (value) => {
    const encoder = makeBigIntIdEncoder(new Hashids("test"));
    expect(encoder.decode(encoder.encode(value))).toBe(value);
  },
);
