import {
  type FormattedExecutionResult,
  getIntrospectionQuery,
  type IntrospectionQuery,
} from "graphql";

import { ServerProcess } from "./helpers/serverProcess.js";

const servers: ServerProcess[] = [];
const urls: Record<string, string> = {};

function startServer(file: string): Promise<string> {
  const server = new ServerProcess(file, { PUBSUB_BACKEND: "local" });
  servers.push(server);
  return server.ready;
}

beforeAll(async () => {
  [urls.apollo, urls.yoga] = await Promise.all([
    startServer("test/testServer.ts"),
    startServer("test/yogaServer.ts"),
  ]);
}, 20_000);

afterAll(async () => {
  await Promise.all(servers.map((server) => server.stop()));
});

async function request(server: string, query: string) {
  return fetch(urls[server], {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/graphql-response+json",
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(5_000),
  });
}

test.each(["apollo", "yoga"])(
  "%s serves queries and mutations over HTTP",
  async (server) => {
    const query = await request(server, "{ __typename }");
    expect(query.status).toBe(200);
    expect(await query.json()).toEqual({ data: { __typename: "Query" } });

    // Exercise the mutation pipeline without writing to a database.
    const mutation = await request(server, "mutation { __typename }");
    expect(mutation.status).toBe(200);
    expect(await mutation.json()).toEqual({ data: { __typename: "Mutation" } });
  },
);

test("both servers expose the same generated schema and custom fields", async () => {
  const query = getIntrospectionQuery();
  const apollo = (await (
    await request("apollo", query)
  ).json()) as FormattedExecutionResult<IntrospectionQuery>;
  const yoga = (await (
    await request("yoga", query)
  ).json()) as FormattedExecutionResult<IntrospectionQuery>;
  expect(apollo.errors).toBeUndefined();
  expect(yoga.errors).toBeUndefined();
  expect(yoga.data).toEqual(apollo.data);
  expect(apollo.data!.__schema.types).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "User",
        fields: expect.arrayContaining([
          expect.objectContaining({ name: "a" }),
          expect.objectContaining({ name: "b" }),
        ]),
      }),
      expect.objectContaining({
        name: "Mutation",
        fields: expect.arrayContaining([
          expect.objectContaining({ name: "upsertUser" }),
        ]),
      }),
      expect.objectContaining({
        name: "Subscription",
        fields: expect.arrayContaining([
          expect.objectContaining({ name: "UserCreated" }),
        ]),
      }),
    ]),
  );
});

test.each(["apollo", "yoga"])(
  "%s rejects invalid operations before database access",
  async (server) => {
    const response = await request(server, "mutation { upsertUser }");
    const result = (await response.json()) as FormattedExecutionResult;
    expect(response.status).toBe(400);
    expect(result.data).toBeUndefined();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('argument "id"'),
        }),
      ]),
    );
  },
);
