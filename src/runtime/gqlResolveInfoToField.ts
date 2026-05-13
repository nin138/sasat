import type { GraphQLResolveInfo, SelectionNode } from "graphql";
import type { Fields } from "./field.js";

export const selectionSetToField = <T extends Fields<unknown>>(
  selections: readonly SelectionNode[],
  number: number,
): [T, number] => {
  const result: Fields<Record<string, unknown>> = {
    fields: [],
    relations: {},
    tableAlias: "t" + number,
  };
  let num = number;
  for (const it of selections) {
    // TODO 'fragmentNode'
    if (it.kind !== "Field") continue;
    if (it.selectionSet) {
      num += 1;
      const field = selectionSetToField(it.selectionSet.selections, num);
      result.relations![it.name.value] = field[0];
      num = field[1];
    } else {
      if (it.name.value !== "__typename") result.fields.push(it.name.value);
    }
  }
  return [result as T, num];
};

export const gqlResolveInfoToField = <
  T extends Fields<unknown> = Fields<unknown>,
>(
  info: GraphQLResolveInfo,
): T => {
  return selectionSetToField<T>(
    info.fieldNodes[0].selectionSet!.selections,
    0,
  )[0];
};
