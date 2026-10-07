import { runInNewContext } from "node:vm";
import { buildSchema } from "graphql";
import Hashids from "hashids";
import ts from "typescript";
import { config } from "../../../config/config.js";
import { DataStoreHandler } from "../../../migration/dataStore.js";
import { StoreMigrator } from "../../../migration/front/storeMigrator.js";
import { Mutations } from "../../../migration/makeMutaion.js";
import { Queries } from "../../../migration/makeQuery.js";
import { createTypeDef } from "../../../runtime/createTypeDef.js";
import { makeNumberIdEncoder } from "../../../runtime/id.js";
import { parse } from "../../parse.js";
import { generateMutationResolver } from "./generateMutationResolver.js";
import { generateResolver } from "./generateResolver.js";
import { generateSubscription } from "./generateSubscription.js";
import { generateTypeDefs } from "./generateTypeDefs.js";

const AccountHashId = makeNumberIdEncoder(new Hashids("accounts"));
const MessageHashId = makeNumberIdEncoder(new Hashids("messages"));

function fixture(enabled = true) {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("account", (table) => {
    table.autoIncrementHashId("id");
    table.column("name").varchar(20);
    table.enableGQL();
    table.addGQLQuery(Queries.primary());
    const subscription = { enabled, subscriptionFilter: ["id"] };
    table.addGQLMutation(
      Mutations.create({ subscription }),
      Mutations.update({ subscription }),
      Mutations.delete({ subscription }),
    );
  });
  store.createTable("message", (table) => {
    table.autoIncrementHashId("id");
    table.references({
      columnName: "account_id",
      parentTable: "account",
      parentColumn: "id",
      relation: "Many",
      fieldName: "account",
      parentFieldName: "messages",
    });
    table.column("status").varchar(20).fieldName("state");
    table.column("rank").int();
    table.enableGQL();
    table.addGQLMutation(
      Mutations.create({
        subscription: {
          enabled,
          subscriptionFilter: ["account_id", "status", "rank"],
        },
      }),
    );
  });
  const data = new DataStoreHandler(store.serialize());
  data.table("account").column("id").data.fieldName = "accountId";
  data.table("message").column("account_id").data.fieldName = "ownerId";
  return parse(data);
}

type Predicate = (
  payload: unknown,
  variables: Record<string, unknown>,
) => Promise<boolean>;
function loadFilters() {
  const exports = {} as {
    subscription: Record<string, { subscribe: Predicate }>;
  };
  const code = generateSubscription(fixture()).toString();
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (/^\.\.\/idEncoder(\.js)?$/.test(name))
          return { AccountHashId, MessageHashId };
        if (/^\.\.\/pubsub(\.js)?$/.test(name)) return { pubsub: {} };
        if (name === "graphql-subscriptions")
          return {
            withFilter:
              (_source: unknown, predicate: Predicate) =>
              (_root: unknown, variables: Record<string, unknown>) =>
              (payload: unknown) =>
                predicate(payload, variables),
          };
        throw new Error("Unexpected generated import: " + name);
      },
    },
  );
  return Object.fromEntries(
    Object.entries(exports.subscription).map(([event, resolver]) => [
      event,
      {
        subscribe: async (
          payload: unknown,
          variables: Record<string, unknown>,
        ) => {
          const predicate = (
            resolver.subscribe as unknown as (
              _root: unknown,
              variables: Record<string, unknown>,
            ) => (payload: unknown) => Promise<boolean>
          )(undefined, variables);
          return predicate(payload);
        },
      },
    ]),
  );
}

test("generates ID arguments for hashed primary and reference columns", () => {
  const exports = {} as {
    typeDefs: Parameters<typeof createTypeDef>[0];
    inputs: Parameters<typeof createTypeDef>[1];
  };
  runInNewContext(
    ts.transpileModule(generateTypeDefs(fixture()).toString(), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports },
  );
  const fields = buildSchema(createTypeDef(exports.typeDefs, exports.inputs))
    .getSubscriptionType()!
    .getFields();
  expect(
    fields.AccountCreated.args.map((arg) => [arg.name, String(arg.type)]),
  ).toEqual([["id", "ID!"]]);
  expect(
    fields.MessageCreated.args.map((arg) => [arg.name, String(arg.type)]),
  ).toEqual([
    ["account_id", "ID!"],
    ["status", "String!"],
    ["rank", "Int!"],
  ]);
});

test.each(["Created", "Updated", "Deleted"])(
  "decodes hashed primary keys for %s, including renamed fields and zero",
  async (suffix) => {
    const event = `Account${suffix}`;
    const filter = loadFilters()[event].subscribe;
    for (const id of [0, 42]) {
      await expect(
        filter(
          { [event]: Promise.resolve({ accountId: id }) },
          { id: AccountHashId.encode(id) },
        ),
      ).resolves.toBe(true);
      await expect(
        filter(
          { [event]: { accountId: id + 1 } },
          { id: AccountHashId.encode(id) },
        ),
      ).resolves.toBe(false);
    }
  },
);

test("uses the referenced encoder and combines hash, string and integer filters", async () => {
  const filter = loadFilters().MessageCreated.subscribe;
  const payload = {
    MessageCreated: { id: 7, ownerId: 42, state: "ready", rank: 0 },
  };
  const variables = {
    account_id: AccountHashId.encode(42),
    status: "ready",
    rank: 0,
  };
  await expect(filter(payload, variables)).resolves.toBe(true);
  await expect(
    filter(payload, { ...variables, account_id: MessageHashId.encode(42) }),
  ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  await expect(
    filter(payload, { ...variables, status: "other" }),
  ).resolves.toBe(false);
  await expect(filter(payload, { ...variables, rank: 1 })).resolves.toBe(false);
});

test("invalid encoded IDs reject at subscription setup", async () => {
  const filter = loadFilters().AccountDeleted.subscribe;
  for (const id of [
    "",
    "not a valid hash!",
    new Hashids("accounts").encode(1, 2),
  ]) {
    await expect(filter({ AccountDeleted: {} }, { id })).rejects.toMatchObject({
      message: "Invalid Hash ID",
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
});

test.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false],
])(
  "subscription global=%s and mutation=%s agree across schema, resolver and publishing",
  (global, individual) => {
    const previous = config().generator.gql.subscription;
    try {
      config().generator.gql.subscription = global;
      const root = fixture(individual);
      const enabled = global && individual;
      expect(root.subscriptions.length > 0).toBe(enabled);
      expect(
        root.entities.flatMap((e) => e.mutations).some((m) => m.subscription),
      ).toBe(enabled);
      const mutation = generateMutationResolver(root).toString();
      const subscription = generateSubscription(root).toString();
      const resolver = generateResolver(root).toString();
      expect(mutation.includes("publishAccountCreated")).toBe(enabled);
      expect(subscription.includes("pubsub")).toBe(enabled);
      expect(resolver.includes("./subscription")).toBe(enabled);
      const exports = {} as {
        typeDefs: Parameters<typeof createTypeDef>[0];
        inputs: Parameters<typeof createTypeDef>[1];
      };
      runInNewContext(
        ts.transpileModule(generateTypeDefs(root).toString(), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText,
        { exports },
      );
      const schema = buildSchema(
        createTypeDef(exports.typeDefs, exports.inputs),
      );
      expect(!!schema.getSubscriptionType()).toBe(enabled);
    } finally {
      config().generator.gql.subscription = previous;
    }
  },
);
