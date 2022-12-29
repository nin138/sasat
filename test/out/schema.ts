import { assignDeep, createTypeDef } from 'sasat';
import { typeDefs, inputs } from './__generated__/typeDefs.js';
import { resolvers } from './__generated__/resolver.js';

export const schema = {
  typeDefs: createTypeDef(assignDeep(typeDefs, {}), assignDeep(inputs, {})),
  resolvers: assignDeep(resolvers, {}),
};
