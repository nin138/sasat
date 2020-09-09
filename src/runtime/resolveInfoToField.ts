import { GraphQLResolveInfo, SelectionNode } from 'graphql';
import { Field } from './resolveField';

const selectionSetToField = (selections: readonly SelectionNode[]): Field => {
  const result: Field = {
    fields: [],
    relations: {},
  };
  selections.forEach(it => {
    // TODO 'fragmentNode'
    if (it.kind !== 'Field') return;
    if (it.selectionSet) {
      result.relations![it.name.value] = selectionSetToField(it.selectionSet.selections);
    } else {
      result.fields.push(it.name.value);
    }
  });
  return result;
};

export const resolveInfoToField = (info: GraphQLResolveInfo): Field => {
  return selectionSetToField(info.fieldNodes[0].selectionSet!.selections);
};
