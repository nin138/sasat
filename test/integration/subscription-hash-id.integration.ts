import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  buildSchema,
  type ExecutionResult,
  type GraphQLFieldResolver,
  type GraphQLObjectType,
  parse as parseGraphQL,
  subscribe,
  validate,
} from "graphql";
import { withFilter } from "graphql-subscriptions";
import Hashids from "hashids";
import ts from "typescript";
import { generateSubscription } from "../../src/generatorv2/codegen/ts/generateSubscription.js";
import { generateTypeDefs } from "../../src/generatorv2/codegen/ts/generateTypeDefs.js";
import { parse } from "../../src/generatorv2/parse.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Mutations } from "../../src/migration/makeMutaion.js";
import { Queries } from "../../src/migration/makeQuery.js";
import {
  type ConfiguredPubSub,
  createPubSub,
} from "../../src/runtime/createPubSub.js";
import { createTypeDef } from "../../src/runtime/createTypeDef.js";
import { makeNumberIdEncoder } from "../../src/runtime/id.js";

const UserHashId = makeNumberIdEncoder(new Hashids("subscription-user"));
const PostHashId = makeNumberIdEncoder(new Hashids("subscription-post"));
const backend = process.env.PUBSUB_BACKEND === "redis" ? "redis" : "local";

function fixture() {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("user", (table) => {
    table.autoIncrementHashId("id");
    table.column("name").varchar(40);
    table.enableGQL();
    table.addGQLQuery(Queries.primary());
    table.addGQLMutation(
      Mutations.create({
        subscription: { enabled: true, subscriptionFilter: ["id"] },
      }),
    );
  });
  store.createTable("post", (table) => {
    table.autoIncrementHashId("id");
    table.column("title").varchar(40);
    table.references({
      columnName: "user_id",
      parentTable: "user",
      parentColumn: "id",
      relation: "Many",
      fieldName: "user",
      parentFieldName: "posts",
    });
    table.enableGQL();
    table.addGQLMutation(
      Mutations.create({
        subscription: {
          enabled: true,
          subscriptionFilter: ["user_id", "title"],
        },
      }),
    );
  });
  const data = new DataStoreHandler(store.serialize());
  data.table("user").column("id").data.fieldName = "userId";
  data.table("post").column("user_id").data.fieldName = "ownerId";
  return parse(data);
}

function evaluate<T>(code: string, pubsub?: ConfiguredPubSub): T {
  const exports = {};
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (/^\.\.\/pubsub(\.js)?$/.test(name)) return { pubsub };
        if (/^\.\.\/idEncoder(\.js)?$/.test(name))
          return { UserHashId, PostHashId };
        if (name === "graphql-subscriptions") return { withFilter };
        throw new Error("Unexpected generated import: " + name);
      },
    },
  );
  return exports as T;
}

type Generated = {
  subscription: Record<
    string,
    { subscribe: GraphQLFieldResolver<unknown, unknown> }
  >;
  publishUserCreated: (entity: unknown) => Promise<void>;
  publishPostCreated: (entity: unknown) => Promise<void>;
};

async function within<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Subscription did not become ready or deliver a matching event",
              ),
            ),
          5000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

for (const foreign of [false, true]) {
  test(`generated ${foreign ? "reference" : "primary"} Hash ID subscription delivers only matching events over ${backend}`, {
    timeout: 12000,
  }, async () => {
    const options: Parameters<typeof createPubSub>[0] = {
      backend,
      redisUrl: process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379",
      channelPrefix: `sasat_hash_it:${randomUUID()}:`,
    };
    const receiver = createPubSub(options);
    const sender = backend === "redis" ? createPubSub(options) : receiver;
    const ready = Promise.withResolvers<void>();
    const originalSubscribe = receiver.subscribe.bind(receiver);
    receiver.subscribe = async (...args) => {
      const id = await originalSubscribe(...args);
      ready.resolve();
      return id;
    };
    let iterator: AsyncIterableIterator<ExecutionResult> | undefined;
    try {
      const root = fixture();
      const definitions = evaluate<{
        typeDefs: Parameters<typeof createTypeDef>[0];
        inputs: Parameters<typeof createTypeDef>[1];
      }>(generateTypeDefs(root).toString());
      const schema = buildSchema(
        createTypeDef(definitions.typeDefs, definitions.inputs),
      );
      const code = generateSubscription(root).toString();
      const receiving = evaluate<Generated>(code, receiver);
      const publishing = evaluate<Generated>(code, sender);
      const event = foreign ? "PostCreated" : "UserCreated";
      schema.getSubscriptionType()!.getFields()[event].subscribe =
        receiving.subscription[event].subscribe;
      (schema.getType("User") as GraphQLObjectType).getFields().userId.resolve =
        (row) => UserHashId.encode(row.userId);
      (
        schema.getType("Post") as GraphQLObjectType
      ).getFields().ownerId.resolve = (row) => UserHashId.encode(row.ownerId);
      const document = parseGraphQL(
        foreign
          ? 'subscription($id: ID!) { PostCreated(user_id: $id, title: "Match") { ownerId title } }'
          : "subscription($id: ID!) { UserCreated(id: $id) { userId name } }",
      );
      assert.deepEqual(validate(schema, document), []);
      const result = await subscribe({
        schema,
        document,
        variableValues: { id: UserHashId.encode(42) },
      });
      assert.ok(Symbol.asyncIterator in result, JSON.stringify(result));
      iterator = result as AsyncIterableIterator<ExecutionResult>;
      const next = iterator.next();
      await within(ready.promise);
      if (foreign) {
        await publishing.publishPostCreated({
          id: 1,
          ownerId: 43,
          title: "Match",
        });
        await publishing.publishPostCreated({
          id: 2,
          ownerId: 42,
          title: "Other",
        });
        await publishing.publishPostCreated({
          id: 3,
          ownerId: 42,
          title: "Match",
        });
      } else {
        await publishing.publishUserCreated({ userId: 43, name: "Other" });
        await publishing.publishUserCreated({ userId: 42, name: "Match" });
      }
      const delivered = await within(next);
      assert.equal(delivered.done, false);
      assert.equal(delivered.value.errors, undefined);
      assert.equal(
        JSON.stringify(delivered.value.data),
        JSON.stringify({
          [event]: foreign
            ? { ownerId: UserHashId.encode(42), title: "Match" }
            : { userId: UserHashId.encode(42), name: "Match" },
        }),
      );
    } finally {
      await iterator?.return?.();
      await receiver.close();
      if (sender !== receiver) await sender.close();
    }
  });
}
