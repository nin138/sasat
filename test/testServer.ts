import { ApolloServer } from '@apollo/server';
import { resolvers } from './out/__generated__/resolver.js';
import { inputs, typeDefs } from './out/__generated__/typeDefs.js';
import { createTypeDef, assignDeep, makeResolver } from '../src/index.js';
import { startStandaloneServer } from '@apollo/server/standalone';
import { UserDBDataSource } from './out/dataSources/db/User.js';

// eslint-disable-next-line @typescript-eslint/ban-types
type Context = {};

const server = new ApolloServer<Context>({
  typeDefs: createTypeDef(
    assignDeep(typeDefs, {
      Mutation: {
        upsertUser: {
          args: [
            { name: 'id', type: 'Int!' },
            { name: 'name', type: 'String!' },
          ],
          return: 'Boolean!',
        },
      },
    }),
    inputs,
  ),
  resolvers: assignDeep(resolvers, {
    Mutation: {
      upsertUser: makeResolver<unknown, { id: number; name: string }>(
        async (_, params, _2) => {
          try {
            await new UserDBDataSource().upsert({
              userId: params.id,
              NNN: params.name,
            } as any);
          } catch (e) {
            console.error(e);
            throw e;
          }
          return true;
        },
      ),
    },
  }),
});

const { url } = await startStandaloneServer(server, { listen: { port: 4444 } });
console.log(`🚀 Server ready at ${url}`);
