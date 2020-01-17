import { IrGqlType } from './ir/gql/types';
import { getGqlTypeString } from './generator/gql/typeDef';

const createTypeString = (key: string, values: string[]) => `\
type ${key} {
${values.map(it => `  ${it}`).join('\n')}
}
`;

export const createTypeDef = (typeDef: Record<string, string[]>) =>
  Object.entries(typeDef)
    .map(([key, value]) => createTypeString(key, value))
    .join('\n');
