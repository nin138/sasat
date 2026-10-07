import type { TypeFieldDefinition } from "../generatorv2/codegen/ts/scripts/typeDefinition.js";
import { numericScalarResolvers } from "./numericScalars.js";

type TypeDef = Record<string, TypeFieldDefinition>;

const makeArgs = (args: TypeFieldDefinition["args"]) => {
  if (!args || args.length === 0) return "";
  return `(${args.map((arg) => `${arg.name}: ${arg.type}`).join(", ")})`;
};

const makeTypedefString = (
  typeName: string,
  typedef: TypeDef,
  type: "type" | "input",
) => {
  const entries = Object.entries(typedef);
  if (entries.length === 0) return "";
  return `\
${type} ${typeName} {
${entries
  .map(([field, value]) => {
    if (!value.return)
      throw new Error(`Return type required: ${typeName}.${field}`);
    return `  ${field}${makeArgs(value.args)}: ${value.return}`;
  })
  .join("\n")}
}
`;
};

export const createTypeDef = (
  typeDefs: Record<string, TypeDef>,
  inputs: Record<string, TypeDef>,
) => {
  const types = Object.entries(typeDefs).map(([type, fields]) =>
    makeTypedefString(type, fields, "type"),
  );
  const input = Object.entries(inputs).map(([type, fields]) =>
    makeTypedefString(type, fields, "input"),
  );
  const scalars = Object.keys(numericScalarResolvers(typeDefs, inputs))
    .map((name) => `scalar ${name}\n`)
    .join("");
  return scalars + types.join("\n") + input.join("\n");
};
