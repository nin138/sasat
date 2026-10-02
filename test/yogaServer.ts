import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import { serverSchema } from "./serverSchema.js";

const yoga = createYoga({ schema: createSchema(serverSchema) });
const server = createServer(yoga);
server.listen(Number(process.env.PORT ?? 4445), () => {
  const address = server.address();
  if (address && typeof address !== "string") {
    console.log(
      `Yoga Server ready at http://localhost:${address.port}/graphql`,
    );
  }
});
