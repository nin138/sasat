import { ApolloServer } from 'apollo-server';
import { resolvers } from './out/__generated__/resolver.js';
import { typeDef } from './out/__generated__/typeDefs.js';
import { createTypeDef } from '../src/runtime/createTypeDef.js';

const server = new ApolloServer({
  typeDefs: createTypeDef(typeDef),
  resolvers,
  debug: true,
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
