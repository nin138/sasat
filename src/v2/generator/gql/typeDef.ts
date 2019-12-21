import { IrGql } from '../../../ir/gql';
import { IrGqlType } from '../../../ir/gql/types';
import { IrGqlQuery } from '../../../ir/gql/query';
import { GqlPrimitive } from '../../../generator/gql/types';

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

const createQueryTypeString = (ir: IrGqlQuery[]) => {
  return `\
type Query {
${ir
  .map(it => {
    const param = it.params.length === 0 ? '' : `(${it.params.map(it => getGqlTypeString(it)).join(', ')})`;
    const returnType = getGqlTypeString({ type: it.entity, isNullable: it.isNullable, isArray: it.isArray });
    return `  ${it.queryName}${param}: ${returnType}`;
  })
  .join('\n')}
}
`;
};

export const generateTypeDefString = (ir: IrGql) => {
  return `\
export const typeDefs = \`
${ir.type.map(createTypeString).join('\n')}
\`;

${createQueryTypeString(ir.queries)}
`;
};
