import { IrGql } from '../../ir/gql';
import { IrGqlParam, IrGqlType } from '../../ir/gql/types';
import { IrGqlQuery } from '../../ir/gql/query';
import { GqlPrimitive } from './types';
import { IrGqlMutation } from '../../ir/gql/mutation';

const getGqlTypeString = (param: { type: string | GqlPrimitive; isNullable: boolean; isArray: boolean }) => {
  let type = param.type;
  if (!param.isNullable) type = type + '!';
  if (param.isArray) type = `[${type}]!`;
  return type;
};

const createTypeString = (ir: IrGqlType) => `\
type ${ir.typeName} {
${ir.params.map(it => `  ${it.name}: ${getGqlTypeString(it)}`).join('\n')}
}

type ${ir.typeName}UpdateResult {
${[
  '  _updatedColumns: [String!]!',
  ...ir.params.map(it => `  ${it.name}: ${getGqlTypeString({ ...it, isNullable: true })}`),
].join('\n')}
}
`;

const createParamString = (params: IrGqlParam[]) => {
  return params.length === 0 ? '' : `(${params.map(it => `${it.name}: ${getGqlTypeString(it)}`).join(', ')})`;
};

const createQueryTypeString = (ir: IrGqlQuery[], additionalQuery: string) => {
  return `\
type Query {
${ir
  .map(it => {
    const param = createParamString(it.params);
    const returnType = getGqlTypeString({ type: it.entity, isNullable: it.isNullable, isArray: it.isArray });
    return `  ${it.queryName}${param}: ${returnType}`;
  })
  .join('\n')}${additionalQuery}
}
`;
};

const createMutationTypeString = (ir: IrGqlMutation, additionalMutation: string): string => {
  return `\
type Mutation {
${ir.entities
  .flatMap(it => [
    `  create${it.entityName}${createParamString(it.onCreateParams)}: ${it.entityName}`,
    `  update${it.entityName}${createParamString(it.onUpdateParams)}: Boolean`,
  ])
  .join('\n')}${additionalMutation}
}
`;
};

const createSubscriptionTypeString = (ir: IrGqlMutation, additionalSubscription: string): string => {
  const onCreate = ir.entities
    .filter(it => it.subscription.onCreate)
    .map(it => `  ${it.entityName}Created: ${it.entityName}`);
  const onUpdate = ir.entities
    .filter(it => it.subscription.onUpdate)
    .map(it => `  ${it.entityName}Updated: ${it.entityName}UpdateResult`);
  const list = onCreate.concat(onUpdate);
  if (list.length === 0) return '';
  return `\
type Subscription {
${list.sort().join('\n')}${additionalSubscription}
}`;
};

export const generateTypeDefString = (
  ir: IrGql,
  option: {
    additionalQuery?: string;
    additionalMutation?: string;
    additionalSubscription?: string;
  } = {},
) => `\
${ir.types.map(createTypeString).join('\n')}
${createQueryTypeString(ir.queries, option.additionalQuery || '')}
${createMutationTypeString(ir.mutations, option.additionalMutation || '')}
${createSubscriptionTypeString(ir.mutations, option.additionalSubscription || '')}`;
