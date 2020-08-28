import { IrGql } from '../../../../ir/gql';
import { TsCodeGenObject } from '../../code/object';
import { tsArrayString } from '../../code/array';
import { createParamString, getGqlTypeString } from '../../../gql/typeDef';
import { IrGqlSubscription } from '../../../../ir/gql/mutation';
import { MutationNode } from '../../../../node/gql/mutationNode';
import { GqlParamNode } from '../../../../node/gql/GqlParamNode';

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
      gql.mutations.map(it => {
        if (MutationNode.isCreateMutation(it)) {
          const params = GqlParamNode.paramsToString(it.entity.onCreateRequiredFields().map(it => it.toGqlParam()));
          return `create${it.entityName}${params}: ${it.entityName}!`;
        }
        if (MutationNode.isUpdateMutation(it)) {
          const params = GqlParamNode.paramsToString([
            ...it.entity
              .identifiableFields()
              .map(it => it.toGqlParam(), ...it.entity.dataFields().map(it => it.toOptionalGqlParam())),
          ]);
          return `update${it.entityName}${params}: Boolean!`;
        }
        const params = GqlParamNode.paramsToString(it.entity.identifiableFields().map(it => it.toGqlParam()));
        return `delete${it.entityName}${params}: Boolean!`;
      }),
    ),
  );

  const createParam = (subscription: IrGqlSubscription): string => {
    if (subscription.filter.length === 0) return '';
    return `(${subscription.filter.map(it => `${it.column}: ${it.type}!`).join(', ')})`;
  };
  // const onCreate = gql.mutations.entities
  //   .filter(it => it.subscription.onCreate)
  //   .map(it => `${it.entityName}Created${createParam(it.subscription)}: ${it.entityName}!`);
  // const onUpdate = gql.mutations.entities
  //   .filter(it => it.subscription.onUpdate)
  //   .map(it => `${it.entityName}Updated${createParam(it.subscription)}: ${it.entityName}!`);
  // const onDelete = gql.mutations.entities
  //   .filter(it => it.subscription.onDelete)
  //   .map(it => `${it.entityName}Deleted${createParam(it.subscription)}: Deleted${it.entityName}!`);
  // const list = [...onCreate, ...onUpdate, ...onDelete];
  // if (list.length === 0) return '';
  // obj.set('Subscription', tsArrayString(list.sort()));

  return `export const typeDef = ${obj.toTsString()}`;
};
