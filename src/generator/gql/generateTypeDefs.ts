import { GqlMutation, GqlQuery, GqlSchema, GqlType } from './types';

const gqlTypeToDefString = (type: GqlType) => `\
type ${type.typeName} {
  ${type.fields.map(it => `${it.name}: ${it.type}${it.nullable ? '' : '!'}`).join('\n  ')}
}
`;

const createGqlQueryString = (query: GqlQuery) => {
  const params = query.params.length === 0 ? '' : `(${query.params.map(it => `${it.name}: ${it.type}`).join(', ')})`;
  return `${query.name}${params}: ${query.returnType}`;
};

const createGqlQueryTypeDef = (queries: GqlQuery[]) => `\
type Query {
  ${queries.map(createGqlQueryString).join('\n  ')}
}
`;

const createGqlMutations = (mutation: GqlMutation) => {
  const create = `create${mutation.modelName}(${mutation.creatable.map(it => it.toString()).join(', ')}): Boolean`;
  const update = `update${mutation.modelName}(${mutation.pKeys
    .map(it => it.toString())
    .concat(mutation.updatable.map(it => it.toNullableString()))
    .join(', ')}): Boolean`;
  return [create, update];
};

const createGqlMutationTypeDef = (mutations: GqlMutation[]) => `\
type Mutation {
  ${mutations.flatMap(createGqlMutations).join('\n  ')}
}
`;

export const generateTypeDefs = (schema: GqlSchema) => {
  const types = schema.types.map(gqlTypeToDefString).join('\n');
  return `\
export const typeDefs = \`
${types}
${createGqlQueryTypeDef(schema.queries)}
${createGqlMutationTypeDef(schema.mutations)}
\`;
`;
};
