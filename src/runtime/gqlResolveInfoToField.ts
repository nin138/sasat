import { GraphQLResolveInfo, SelectionNode } from 'graphql';
import { Fields } from './field.js';

export const selectionSetToField = <T extends Fields<unknown>>(
  selections: readonly SelectionNode[],
  number: number,
): [T, number] => {
  const result: Fields<Record<string, unknown>> = {
    fields: [],
    relations: {},
    tableAlias: 't' + number,
  };
  let num = number;
  selections.forEach(it => {
    // TODO 'fragmentNode'
    if (it.kind !== 'Field') return;
    if (it.selectionSet) {
      num += 1;
      const field = selectionSetToField(it.selectionSet.selections, num);
      result.relations![it.name.value] = field[0];
      num = field[1];
    } else {
      if (it.name.value !== '__typename') result.fields.push(it.name.value);
    }
  });
  return [result as T, num];
};

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const gqlResolveInfoToField = <T extends Fields<any> = Fields<unknown>>(
  info: GraphQLResolveInfo,
): T => {
  return selectionSetToField<T>(
    info.fieldNodes[0].selectionSet!.selections,
    0,
  )[0];
};
