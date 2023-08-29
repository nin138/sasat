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
      User: {
        a: { return: 'String' },
        b: { return: '[User!]!' },
      },
      Mutation: {
        upsertUser: {
          args: [
            { name: 'id', type: 'Int!' },
            { name: 'name', type: 'String!' },
            { name: 'NNN', type: 'String!' },
          ],
          return: 'Boolean!',
        },
      },
    }),
    inputs,
  ),
  resolvers: assignDeep(resolvers, {
    User: {
      a: () => {
        return 'test';
      },
      b: () => {
        return [];
      },
    },
    Mutation: {
      upsertUser: makeResolver<
        unknown,
        { id: number; name: string; NNN: string }
      >(async (_, params, _2) => {
        try {
          await new UserDBDataSource().upsert(
            {
              userId: params.id,
              NNN: params.NNN,
              nick: params.name,
            },
            ['NNN'],
          );
        } catch (e) {
          console.error(e);
          throw e;
        }
        return true;
      }),
    },
  }),
});

const { url } = await startStandaloneServer(server, { listen: { port: 4444 } });
console.log(`🚀 Server ready at ${url}`);
