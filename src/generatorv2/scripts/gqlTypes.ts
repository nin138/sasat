export type GQLPrimitive =
  | "Int"
  | "Float"
  | "String"
  | "Boolean"
  | "ID"
  | "Decimal"
  | "BigInt";

export const toTsType = (type: GQLPrimitive | string) => {
  switch (type) {
    case "BigInt":
      return "bigint";
    case "Decimal":
      return "string";
    case "Int":
    case "Float":
      return "number";
    case "ID":
    case "String":
      return "string";
    case "Boolean":
      return "boolean";
    default:
      return type;
  }
};
