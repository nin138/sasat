import { IrGql } from '../../ir/gql';
import { IrGqlParam, IrGqlType } from '../../ir/gql/types';
import { IrGqlQuery } from '../../ir/gql/query';
import { GqlPrimitive } from './types';
import { IrGqlMutation } from '../../ir/gql/mutation';

const getGqlTypeString = (param: { type: string | GqlPrimitive; isNullable: boolean; isArray: boolean }) => {
  let type = param.type;
  if (!param.isNullable) type = type + '!';
  if (param.isArray) type = `[${type}]`;
  return type;
};

const createTypeString = (ir: IrGqlType) => `\
type ${ir.typeName} {
${ir.params.map(it => `  ${it.name}: ${getGqlTypeString(it)}`).join('\n')}
}
`;

const createParamString = (params: IrGqlParam[]) => {
  return params.length === 0 ? '' : `(${params.map(it => `${it.name}: ${getGqlTypeString(it)}`).join(', ')})`;
};

const createQueryTypeString = (ir: IrGqlQuery[]) => {
  return `\
type Query {
${ir
  .map(it => {
    const param = createParamString(it.params);
    const returnType = getGqlTypeString({ type: it.entity, isNullable: it.isNullable, isArray: it.isArray });
    return `  ${it.queryName}${param}: ${returnType}`;
  })
  .join('\n')}
}
`;
};

const createMutationTypeString = (ir: IrGqlMutation): string => {
  return (
    'type Mutation {\n' +
    ir.entities
      .flatMap(it => [
        `  create${it.entityName}${createParamString(it.onCreateParams)}: ${it.entityName}`,
        `  update${it.entityName}${createParamString(it.onUpdateParams)}: Boolean`,
      ])
      .join('\n') +
    '\n}'
  );
};

export const generateTypeDefString = (ir: IrGql) => `\
${ir.types.map(createTypeString).join('\n')}
${createQueryTypeString(ir.queries)}
${createMutationTypeString(ir.mutations)}
`;
