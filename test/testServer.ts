import { schema } from './out/schema';
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({ ...schema, debug: true });

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
