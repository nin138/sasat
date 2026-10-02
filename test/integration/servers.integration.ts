import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type { FormattedExecutionResult } from "graphql";
import {
  type Connection,
  createConnection,
  type RowDataPacket,
} from "mysql2/promise";
import { ServerProcess } from "../helpers/serverProcess.js";
import { UserHashId } from "../out/idEncoder.js";
import { migrationStore } from "./migrations.js";

const connectionOptions = {
  host: process.env.TEST_DB_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT ?? 3308),
  user: process.env.TEST_DB_USER ?? "root",
  password: process.env.TEST_DB_PASSWORD ?? "",
  connectTimeout: 5_000,
};
let connection: Connection | undefined;
const databases: string[] = [];
const servers: ServerProcess[] = [];
const urls: string[] = [];

function serverEnvironment(database: string) {
  return {
    NODE_ENV: "production",
    DB_HOST: connectionOptions.host,
    DB_PORT: String(connectionOptions.port),
    DB_USER: connectionOptions.user,
    DB_PASSWORD: connectionOptions.password,
    DATABASE: database,
  };
}

before(
  async () => {
    connection = await createConnection(connectionOptions);
    const sql = migrationStore().getSql();
    for (const entry of [
      "test/testServer.ts",
      "test/integration/yogaObserver.ts",
    ]) {
      const database = `sasat_it_${randomUUID().replaceAll("-", "")}`;
      // Never use DATABASE/DB_NAME or reset an existing database.
      await connection.query("CREATE DATABASE ??", [database]);
      databases.push(database);
      await connection.query("USE ??", [database]);
      for (const statement of sql) await connection.query(statement);
      const server = new ServerProcess(entry, serverEnvironment(database));
      servers.push(server);
      urls.push(await server.ready);
    }
  },
  { timeout: 40_000 },
);

after(async () => {
  try {
    await Promise.all(servers.map((server) => server.stop()));
  } finally {
    if (connection) {
      try {
        for (const database of databases) {
          await connection.query("DROP DATABASE ??", [database]);
        }
      } finally {
        await connection.end();
      }
    }
  }
});

async function request<T>(
  url: string,
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/graphql-response+json",
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(5_000),
  });
  const result = (await response.json()) as FormattedExecutionResult<T>;
  return { status: response.status, result };
}

async function graphql<T>(
  server: number,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const { status, result } = await request<T>(urls[server], query, variables);
  assert.equal(status, 200, JSON.stringify(result));
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  assert.ok(result.data);
  return result.data;
}

test("Apollo and Yoga produce identical database CRUD and relation results", {
  timeout: 20_000,
}, async () => {
  const results = [];
  for (const server of [0, 1]) {
    const initial = await graphql<{
      users: { NNN: string; uPost: { title: string }[] }[];
    }>(
      server,
      '{ users(option: { numberOfItem: 10, order: "userId", asc: true }) { NNN nick uPost { title pUser { NNN } } } }',
    );
    assert.equal(initial.users.length, 3);
    assert.equal(initial.users[0].uPost.length, 3);
    assert.deepEqual(initial.users[0].uPost.map((post) => post.title).sort(), [
      "t1",
      "t2",
      "t3",
    ]);
    const created = await graphql<{
      createUser: { userId: string; NNN: string };
    }>(
      server,
      'mutation { createUser(user: { NNN: "Ada", nick: "ada" }) { userId NNN nick foo } }',
    );
    const id = created.createUser.userId;
    assert.equal(created.createUser.NNN, "Ada");
    const post = await graphql(
      server,
      'mutation($id: ID!) { createPost(post: { uId: $id, title: "New post" }) { postId title pUser { userId NNN } } }',
      { id },
    );
    const updated = await graphql(
      server,
      'mutation($id: ID!) { updateUser(user: { userId: $id, NNN: "Grace" }) }',
      { id },
    );
    assert.deepEqual(updated, { updateUser: true });
    const fetched = await graphql<{
      user: { NNN: string; uPost: { title: string }[] };
    }>(
      server,
      "query($id: ID!) { user(userId: $id) { userId NNN nick a b { userId } uPost { title pUser { NNN } } } }",
      { id },
    );
    assert.equal(fetched.user.NNN, "Grace");
    assert.equal(fetched.user.uPost[0].title, "New post");
    const [rows] = await connection!.query<RowDataPacket[]>(
      "SELECT name FROM ??.user WHERE nickName = ?",
      [databases[server], "ada"],
    );
    assert.equal(rows[0].name, "Grace");
    results.push({ initial, created, post, updated, fetched });
  }
  assert.deepEqual(results[0], results[1]);
});

test("Apollo and Yoga return null and false for a valid but nonexistent ID", async () => {
  const id = UserHashId.encode(2_000_000_000);
  for (const server of [0, 1]) {
    assert.deepEqual(
      await graphql(
        server,
        "query($id: ID!) { user(userId: $id) { userId } }",
        { id },
      ),
      { user: null },
    );
    assert.deepEqual(
      await graphql(
        server,
        'mutation($id: ID!) { updateUser(user: { userId: $id, NNN: "Missing" }) }',
        { id },
      ),
      { updateUser: false },
    );
  }
});

test("Apollo and Yoga report duplicate-key errors with their default masking", async () => {
  for (const server of [0, 1]) {
    const query =
      'mutation { createUser(user: { NNN: "Original", nick: "duplicate-test" }) { userId } }';
    await graphql(server, query);
    const { status, result } = await request(urls[server], query);
    assert.equal(status, 200);
    // createUser is non-null, so an execution error nulls the root data.
    assert.equal(result.data, null);
    assert.equal(result.errors?.length, 1);
    const error = result.errors![0];
    assert.deepEqual(error.path, ["createUser"]);
    assert.equal(error.extensions?.code, "INTERNAL_SERVER_ERROR");
    if (server === 0) {
      assert.match(error.message, /Duplicate entry/);
    } else {
      assert.equal(error.message, "Unexpected error.");
      assert.doesNotMatch(
        JSON.stringify(result),
        /duplicate-test|INSERT|stacktrace/,
      );
    }
    const [rows] = await connection!.query<RowDataPacket[]>(
      "SELECT name FROM ??.user WHERE nickName = ?",
      [databases[server], "duplicate-test"],
    );
    assert.deepEqual(rows, [{ name: "Original" }]);
    assert.deepEqual(await graphql(server, "{ __typename }"), {
      __typename: "Query",
    });
  }
});

test("Apollo and Yoga reject missing or invalid authentication before writing", {
  timeout: 40_000,
}, async () => {
  const token = randomUUID();
  for (const [index, name] of ["apollo", "yoga"].entries()) {
    const server = new ServerProcess("test/integration/authServer.ts", {
      ...serverEnvironment(databases[index]),
      TEST_SERVER: name,
      TEST_AUTH_TOKEN: token,
    });
    try {
      const url = await server.ready;
      const query =
        'mutation { createUser(user: { NNN: "Authenticated", nick: "auth-test" }) { userId NNN } }';
      const rejectedHeaders: Record<string, string>[] = [
        {},
        { authorization: "Bearer invalid" },
      ];
      for (const headers of rejectedHeaders) {
        const { status, result } = await request(url, query, {}, headers);
        assert.equal(status, 200);
        assert.equal(result.data, null);
        assert.equal(result.errors?.length, 1);
        assert.equal(result.errors![0].message, "Authentication required");
        assert.equal(result.errors![0].extensions?.code, "UNAUTHENTICATED");
        assert.deepEqual(result.errors![0].path, ["createUser"]);
      }
      const [beforeRows] = await connection!.query<RowDataPacket[]>(
        "SELECT userId FROM ??.user WHERE nickName = ?",
        [databases[index], "auth-test"],
      );
      assert.equal(beforeRows.length, 0);
      const { status, result } = await request<{ createUser: { NNN: string } }>(
        url,
        query,
        {},
        { authorization: `Bearer ${token}` },
      );
      assert.equal(status, 200);
      assert.equal(result.errors, undefined);
      assert.equal(result.data?.createUser.NNN, "Authenticated");
      const [afterRows] = await connection!.query<RowDataPacket[]>(
        "SELECT name FROM ??.user WHERE nickName = ?",
        [databases[index], "auth-test"],
      );
      assert.deepEqual(afterRows, [{ name: "Authenticated" }]);
    } finally {
      await server.stop();
    }
  }
});

async function waitForSubscriptions(count: number) {
  const deadline = Date.now() + 5_000;
  while (servers[1].subscriptionCount !== count) {
    assert.ok(
      Date.now() < deadline,
      `Expected ${count} active PubSub subscriptions, got ${servers[1].subscriptionCount}`,
    );
    await delay(10);
  }
}

function subscribe(query: string) {
  const controller = new AbortController();
  const response = fetch(urls[1], {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
  });
  // A connection failure must not become an unhandled rejection while waiting for IPC.
  void response.catch(() => {});
  return { controller, response };
}

async function nextEvent(response: Response) {
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /text\/event-stream/,
  );
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      assert.equal(
        done,
        false,
        "Subscription ended before delivering an event",
      );
      buffer += decoder
        .decode(value, { stream: true })
        .replaceAll("\r\n", "\n");
      let end = buffer.indexOf("\n\n");
      while (end !== -1) {
        const event = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (event.includes("event: next")) {
          const data = event
            .split("\n")
            .find((line) => line.startsWith("data:"));
          assert.ok(data);
          return JSON.parse(data.slice(5));
        }
        end = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

test("Yoga delivers a created event over SSE and releases PubSub on disconnect", {
  timeout: 15_000,
}, async () => {
  const stream = subscribe("subscription { UserCreated { userId NNN } }");
  try {
    await waitForSubscriptions(1);
    const created = await graphql<{
      createUser: { userId: string; NNN: string };
    }>(
      1,
      'mutation { createUser(user: { NNN: "SSE", nick: "sse" }) { userId NNN } }',
    );
    assert.deepEqual(await nextEvent(await stream.response), {
      data: { UserCreated: created.createUser },
    });
    stream.controller.abort();
    await waitForSubscriptions(0);
    assert.deepEqual(await graphql(1, "{ __typename }"), {
      __typename: "Query",
    });
  } finally {
    stream.controller.abort();
    await stream.response.catch(() => {});
  }
});

test("Yoga filters renamed fields and releases a pending subscription on disconnect", {
  timeout: 15_000,
}, async () => {
  const created = await graphql<{ createUser: { userId: string } }>(
    1,
    'mutation { createUser(user: { NNN: "Before", nick: "filtered" }) { userId } }',
  );
  const stream = subscribe(
    'subscription { UserUpdated(name: "Match") { userId NNN } }',
  );
  try {
    await waitForSubscriptions(1);
    for (const name of ["Other", "Match"]) {
      await graphql(
        1,
        "mutation($id: ID!, $name: String!) { updateUser(user: { userId: $id, NNN: $name }) }",
        { id: created.createUser.userId, name },
      );
    }
    assert.deepEqual(await nextEvent(await stream.response), {
      data: {
        UserUpdated: { userId: created.createUser.userId, NNN: "Match" },
      },
    });
  } finally {
    stream.controller.abort();
    await stream.response.catch(() => {});
    await waitForSubscriptions(0);
  }
  // Cancel while iterator.next() is pending, without any matching event.
  const pending = subscribe(
    'subscription { UserUpdated(name: "Never") { userId } }',
  );
  try {
    await waitForSubscriptions(1);
  } finally {
    pending.controller.abort();
    await pending.response.catch(() => {});
    await waitForSubscriptions(0);
  }
});
