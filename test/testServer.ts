import { ApolloServer } from 'apollo-server';
import { resolvers } from './out/__generated__/resolver.js';
import {inputs, typeDefs} from './out/__generated__/typeDefs.js';
import { createTypeDef } from '../src/runtime/createTypeDef.js';

const server = new ApolloServer({
  typeDefs: createTypeDef(typeDefs, inputs),
  resolvers,
  debug: true,
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
