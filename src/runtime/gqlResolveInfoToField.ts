import { GraphQLResolveInfo, SelectionNode } from 'graphql';
import { Fields } from './field.js';

const selectionSetToField = (selections: readonly SelectionNode[], number: number): [Fields, number] => {
  const result: Fields = {
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
      result.fields.push(it.name.value);
    }
  });
  return [result, num];
};

export const gqlResolveInfoToField = (info: GraphQLResolveInfo): Fields => {
  return selectionSetToField(info.fieldNodes[0].selectionSet!.selections, 0)[0];
};
