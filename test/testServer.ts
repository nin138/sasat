import { ApolloServer } from '@apollo/server';
import { resolvers } from './outv1/__generated__/resolver.js';
import { inputs, typeDefs } from './outv1/__generated__/typeDefs.js';
import { createTypeDef } from '../src/index.js';
import { startStandaloneServer } from '@apollo/server/standalone';

// eslint-disable-next-line @typescript-eslint/ban-types
type Context = {};

const server = new ApolloServer<Context>({
  typeDefs: createTypeDef(typeDefs, inputs),
  resolvers,
});

const { url } = await startStandaloneServer(server);
console.log(`🚀 Server ready at ${url}`);
