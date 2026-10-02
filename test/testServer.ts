import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { serverSchema } from "./serverSchema.js";

const server = new ApolloServer(serverSchema);
const { url } = await startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT ?? 4444) },
});
console.log(`Apollo Server ready at ${url}`);
