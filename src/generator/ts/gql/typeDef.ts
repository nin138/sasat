import { generateTypeDefString } from '../../gql/typeDef';
import { IrGql } from '../../../ir/gql';

const additionalQuery = `\\
\${option.queries?.map(it => \`\\n  \${it}\`).join('') || ''}`;

const additionalMutation = `\\
\${option.mutations?.map(it => \`\\n  \${it}\`).join('') || ''}`;

const additionalSubscription = `\\
\${option.subscriptions?.map(it => \`\\n  \${it}\`).join('') || ''}`;

export const generateTsTypeDefString = (ir: IrGql) => `\
export const createTypeDefs = (option: {
  types?: string[];
  queries?: string[];
  mutations?: string[];
  subscriptions?: string[];
} = {}) => \`\\
\${option.types?.join('\\n') || ''}
${generateTypeDefString(ir, { additionalQuery, additionalMutation, additionalSubscription })}
\`;
`;
