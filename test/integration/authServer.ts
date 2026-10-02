// Exercise application-defined authentication around a generated mutation.
import { createServer } from "node:http";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import { makeResolver, type ResolverMiddleware } from "../../src/index.js";
import type { UserCreatable } from "../out/__generated__/entities/User.js";
import { serverSchema } from "../serverSchema.js";

type Context = { userId: string | null };
const token = process.env.TEST_AUTH_TOKEN;
if (!token) throw new Error("TEST_AUTH_TOKEN is required by the test fixture");
const context = (authorization: string | undefined | null): Context => ({
  userId: authorization === `Bearer ${token}` ? "test-user" : null,
});
const requireUser: ResolverMiddleware<Context> = (args) => {
  if (!args[2].userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return args;
};
const schema = {
  ...serverSchema,
  resolvers: {
    ...serverSchema.resolvers,
    Mutation: {
      ...serverSchema.resolvers.Mutation,
      createUser: makeResolver<Context, { user: UserCreatable }>(
        (root, args, _context, info) =>
          serverSchema.resolvers.Mutation.createUser(root, args, {}, info),
        [requireUser],
      ),
    },
  },
};
const port = Number(process.env.PORT ?? 0);
if (process.env.TEST_SERVER === "apollo") {
  const server = new ApolloServer<Context>(schema);
  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }) => context(req.headers.authorization),
  });
  console.log(`Apollo Server ready at ${url}`);
} else if (process.env.TEST_SERVER === "yoga") {
  const yoga = createYoga({
    schema: createSchema(schema),
    context: ({ request }) => context(request.headers.get("authorization")),
  });
  const server = createServer(yoga);
  server.listen(port, () => {
    const address = server.address();
    if (address && typeof address !== "string") {
      console.log(
        `Yoga Server ready at http://localhost:${address.port}/graphql`,
      );
    }
  });
} else {
  throw new Error("TEST_SERVER must be apollo or yoga");
}
