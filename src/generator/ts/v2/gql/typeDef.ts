import { IrGql } from '../../../../ir/gql';
import { TsCodeGenObject } from '../../code/object';
import { tsArrayString } from '../../code/array';
import { createParamString, getGqlTypeString } from '../../../gql/typeDef';
import { MutationNode } from '../../../../node/gql/mutationNode';
import { GqlParamNode } from '../../../../node/gql/GqlParamNode';
import { SubscriptionFilterNode } from '../../../../node/gql/subscriptionFilterNode';
import { ArrayLiteral, ObjectLiteral, StringLiteral } from '../code/node/expressions';
import { PropertyAssignment } from '../code/node/propertyAssignment';

export const generateTsTypeDef = (gql: IrGql) => {
  const obj = new TsCodeGenObject();
  const types = new ObjectLiteral(
    ...gql.types.map(
      type =>
        new PropertyAssignment(
          type.typeName,
          new ArrayLiteral(type.params.map(it => new StringLiteral(`${it.name}: ${getGqlTypeString(it)}`))),
        ),
    ),
  );

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

  const createParam = (filters: SubscriptionFilterNode[]): string => {
    if (filters.length === 0) return '';
    return `(${filters.map(it => `${it.columnName}: ${it.type}!`).join(', ')})`;
  };
  const list = gql.mutations
    .filter(it => it.subscribed)
    .map(it => {
      if (MutationNode.isCreateMutation(it)) {
        return `${it.entityName}Created${createParam(it.subscriptionFilters)}: ${it.entityName}!`;
      }
      if (MutationNode.isUpdateMutation(it)) {
        return `${it.entityName}Updated${createParam(it.subscriptionFilters)}: ${it.entityName}!`;
      }
      return `${it.entityName}Deleted${createParam(it.subscriptionFilters)}: Deleted${it.entityName}!`;
    });
  if (list.length === 0) return '';
  obj.set('Subscription', tsArrayString(list.sort()));

  return `export const typeDef = ${obj.toTsString()}`;
};
