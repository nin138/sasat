import { generateTypeDefString } from '../../gql/typeDef';
import { IrGql } from '../../../ir/gql';

export const generateTsTypeDefString = (ir: IrGql) => `\
export const typeDefs = \`
${generateTypeDefString(ir)}
\`;
`;
