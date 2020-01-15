import { IrGql } from '../../ir/gql';
import { IrGqlParam, IrGqlType } from '../../ir/gql/types';
import { IrGqlQuery } from '../../ir/gql/query';
import { GqlPrimitive } from './types';
import { IrGqlMutation, IrGqlSubscription } from '../../ir/gql/mutation';

const getGqlTypeString = (param: {
  type: string | GqlPrimitive;
  isNullable: boolean;
  isArray: boolean;
  isArrayNullable?: boolean;
}) => {
  let type = param.type;
  if (!param.isNullable) type = type + '!';
  if (param.isArray) type = `[${type}]${param.isArrayNullable ? '' : '!'}`;
  return type;
};

const createTypeString = (ir: IrGqlType) => `\
type ${ir.typeName} {
${ir.params.map(it => `  ${it.name}: ${getGqlTypeString(it)}`).join('\n')}
}

type ${ir.typeName}UpdateResult {
${[
  '  _updatedColumns: [String!]!',
  ...ir.params
    .filter(it => !it.isReference)
    .map(it => `  ${it.name}: ${getGqlTypeString({ ...it, isNullable: true, isArrayNullable: true })}`),
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
    const returnType = getGqlTypeString({
      type: it.entity,
      isNullable: it.isNullable,
      isArray: it.isArray,
      isArrayNullable: false,
    });
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
  const createParam = (subscription: IrGqlSubscription): string => {
    if (subscription.filter.length === 0) return '';
    return `(${subscription.filter.map(it => `${it.column}: ${it.type}!`).join(', ')})`;
  };
  const onCreate = ir.entities
    .filter(it => it.subscription.onCreate)
    .map(it => `  ${it.entityName}Created${createParam(it.subscription)}: ${it.entityName}`);
  const onUpdate = ir.entities
    .filter(it => it.subscription.onUpdate)
    .map(it => `  ${it.entityName}Updated${createParam(it.subscription)}: ${it.entityName}UpdateResult`);
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
