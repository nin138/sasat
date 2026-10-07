import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
import type { TypeFieldDefinition } from "../generatorv2/codegen/ts/scripts/typeDefinition.js";

const decimal = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)
  )
    throw new GraphQLError(
      "Decimal must be a finite decimal string (without exponent notation)",
    );
  return value;
};
const bigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "string" && /^[+-]?\d+$/.test(value))
    return BigInt(value);
  if (typeof value === "number" && Number.isSafeInteger(value))
    return BigInt(value);
  throw new GraphQLError("BigInt must be an integer string or a safe integer");
};

/** Exact decimals remain strings, including their scale. */
export const DecimalScalar = new GraphQLScalarType({
  name: "Decimal",
  description:
    "An exact finite decimal, transported as a string without exponent notation.",
  serialize: decimal,
  parseValue: decimal,
  parseLiteral(node) {
    if (
      node.kind === Kind.STRING ||
      node.kind === Kind.INT ||
      node.kind === Kind.FLOAT
    )
      return decimal(node.value);
    throw new GraphQLError(
      "Decimal requires a decimal string or numeric literal",
      { nodes: node },
    );
  },
});

/** GraphQL JSON uses strings; resolvers and data sources use native bigint. */
export const BigIntScalar = new GraphQLScalarType({
  name: "BigInt",
  description:
    "An arbitrary precision integer, transported as a string and resolved as bigint.",
  serialize: (value) => String(bigInt(value)),
  parseValue: bigInt,
  parseLiteral(node) {
    if (node.kind === Kind.STRING || node.kind === Kind.INT)
      return bigInt(node.value);
    throw new GraphQLError(
      "BigInt requires an integer string or integer literal",
      { nodes: node },
    );
  },
});

/** Register only scalars referenced by fields, inputs, or arguments. */
export function numericScalarResolvers(
  ...definitions: Record<string, Record<string, TypeFieldDefinition>>[]
): Record<string, GraphQLScalarType> {
  const used = new Set(
    definitions
      .flatMap((definition) =>
        Object.values(definition).flatMap((fields) =>
          Object.values(fields).flatMap((field) => [
            field.return,
            ...(field.args ?? []).map((arg) => arg.type),
          ]),
        ),
      )
      .map((type) => type.replace(/[[\]!]/g, "")),
  );
  return Object.fromEntries(
    [DecimalScalar, BigIntScalar]
      .filter((scalar) => used.has(scalar.name))
      .map((scalar) => [scalar.name, scalar]),
  );
}
