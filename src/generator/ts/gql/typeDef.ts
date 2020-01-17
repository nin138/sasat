import { createParamString, getGqlTypeString } from '../../gql/typeDef';
import { IrGql } from '../../../ir/gql';
import { TsCodeGenObject } from '../code/object';
import { tsArrayString } from '../code/array';
import { IrGqlSubscription } from '../../../ir/gql/mutation';

export const generateTsTypeDef = (gql: IrGql) => {
  const obj = new TsCodeGenObject();
  gql.types.forEach(type => {
    obj.set(type.typeName, tsArrayString(type.params.map(it => `${it.name}: ${getGqlTypeString(it)}`)));
  });
  obj.set(
    'Query',
    tsArrayString(
      gql.queries.map(it => {
        const param = createParamString(it.params);
        const returnType = getGqlTypeString({
          type: it.entity,
          isNullable: it.isNullable,
          isArray: it.isArray,
          isArrayNullable: false,
        });
        return `${it.queryName}${param}: ${returnType}`;
      }),
    ),
  );
  obj.set(
    'Mutation',
    tsArrayString(
      gql.mutations.entities.flatMap(it => [
        `create${it.entityName}${createParamString(it.onCreateParams)}: ${it.entityName}!`,
        `update${it.entityName}${createParamString(it.onUpdateParams)}: Boolean!`,
      ]),
    ),
  );

  const createParam = (subscription: IrGqlSubscription): string => {
    if (subscription.filter.length === 0) return '';
    return `(${subscription.filter.map(it => `${it.column}: ${it.type}!`).join(', ')})`;
  };
  const onCreate = gql.mutations.entities
    .filter(it => it.subscription.onCreate)
    .map(it => `${it.entityName}Created${createParam(it.subscription)}: ${it.entityName}!`);
  const onUpdate = gql.mutations.entities
    .filter(it => it.subscription.onUpdate)
    .map(it => `${it.entityName}Updated${createParam(it.subscription)}: ${it.entityName}!`);
  const list = onCreate.concat(onUpdate);
  if (list.length === 0) return '';
  obj.set('Subscription', tsArrayString(list.sort()));

  return `export const typeDef = ${obj.toTsString()}`;
};
