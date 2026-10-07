import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { buildSchema, validateSchema } from "graphql";
import { PubSub, withFilter } from "graphql-subscriptions";
import Hashids from "hashids";
import ts from "typescript";
import { config } from "../config/config.js";
import { DataStoreHandler } from "../migration/dataStore.js";
import { StoreMigrator } from "../migration/front/storeMigrator.js";
import { Mutations } from "../migration/makeMutaion.js";
import { Queries } from "../migration/makeQuery.js";
import { createPubSub } from "../runtime/createPubSub.js";
import { createTypeDef } from "../runtime/createTypeDef.js";
import { makeNumberIdEncoder } from "../runtime/id.js";
import { makeResolver } from "../runtime/makeResolver.js";
import { numericScalarResolvers } from "../runtime/numericScalars.js";
import { publishAfterWrite } from "../runtime/publishAfterWrite.js";
import { pick } from "../runtime/util.js";
import { CodeGen_v2 } from "./codegen_v2.js";
import { parse } from "./parse.js";

let dir: string;
let original: ReturnType<typeof config>;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sasat-codegen-"));
  original = structuredClone(config());
  config().migration.out = dir;
  config().generator.addJsExtToImportStatement = true;
});
afterEach(() => {
  Object.assign(config(), original);
  rmSync(dir, { recursive: true, force: true });
});

function fixture(nameField = "name") {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("user", (table) => {
    table.autoIncrementHashId("id", { salt: "users" });
    table.column("name").varchar(80).fieldName(nameField);
    table.enableGQL();
    table.addGQLQuery(
      Queries.primary(),
      Queries.listAll("users"),
      Queries.paging("userPage"),
      Queries.single("firstUser"),
    );
    table.addGQLMutation(
      Mutations.create({ subscription: true, middlewares: ["auth"] }),
      Mutations.update(),
      Mutations.delete(),
    );
  });
  store.createTable("post", (table) => {
    table.autoIncrementHashId("id");
    table.column("title").varchar(100);
    table.references({
      columnName: "userId",
      parentTable: "user",
      parentColumn: "id",
      relation: "Many",
      fieldName: "user",
      parentFieldName: "posts",
    });
    table.enableGQL();
    table.addGQLQuery(Queries.primary());
    table.addGQLMutation(Mutations.create());
  });
  return new DataStoreHandler(store.serialize());
}

test("generates entities, CRUD resolvers, relations and parseable TypeScript", async () => {
  await new CodeGen_v2(fixture()).generate();
  const generated = join(dir, "__generated__");
  expect(readFileSync(join(generated, "entities/User.ts"), "utf8")).toContain(
    "User",
  );
  expect(readFileSync(join(generated, "typeDefs.ts"), "utf8")).toContain(
    "UserCreateInput",
  );
  expect(readFileSync(join(generated, "relationMap.ts"), "utf8")).toContain(
    "userId",
  );
  expect(readFileSync(join(generated, "mutation.ts"), "utf8")).toContain(
    "createUser",
  );
  expect(existsSync(join(dir, "middlewares.ts"))).toBe(true);
  const exports = {} as {
    typeDefs: Parameters<typeof createTypeDef>[0];
    inputs: Parameters<typeof createTypeDef>[1];
  };
  const compiled = ts.transpileModule(
    readFileSync(join(generated, "typeDefs.ts"), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  );
  runInNewContext(compiled.outputText, { exports });
  expect(
    validateSchema(
      buildSchema(createTypeDef(exports.typeDefs, exports.inputs)),
    ),
  ).toEqual([]);
  const files = readdirSync(dir, { recursive: true }).filter(
    (p) => typeof p === "string" && p.endsWith(".ts"),
  ) as string[];
  expect(files.length).toBeGreaterThan(15);
  for (const file of files) {
    const result = ts.transpileModule(readFileSync(join(dir, file), "utf8"), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
      },
    });
    expect(
      (result.diagnostics || []).filter(
        (d) => d.category === ts.DiagnosticCategory.Error,
      ),
    ).toEqual([]);
  }
});

test("preserves custom files and removes obsolete generated output on regeneration", async () => {
  const generator = new CodeGen_v2(fixture());
  await generator.generate();
  const custom = join(dir, "dataSources/db/User.ts");
  const edited = readFileSync(custom, "utf8") + "\n// user customization\n";
  writeFileSync(custom, edited);
  const middleware = join(dir, "middlewares.ts");
  const originalMiddleware =
    readFileSync(middleware, "utf8") + "\n// custom auth\n";
  writeFileSync(middleware, originalMiddleware);
  const pubsub = join(dir, "pubsub.ts");
  const customPubsub = "// user-owned PubSub implementation\n";
  writeFileSync(pubsub, customPubsub);
  writeFileSync(join(dir, "__generated__/obsolete.ts"), "obsolete");
  await generator.generate();
  expect(readFileSync(custom, "utf8")).toBe(edited);
  expect(readFileSync(middleware, "utf8")).toBe(originalMiddleware);
  expect(readFileSync(pubsub, "utf8")).toBe(customPubsub);
  expect(existsSync(join(dir, "__generated__/obsolete.ts"))).toBe(false);
});

test("generated pubsub uses the configurable runtime factory", async () => {
  await new CodeGen_v2(fixture()).generate();
  const exports = {} as { pubsub: ReturnType<typeof createPubSub> };
  const compiled = ts.transpileModule(
    readFileSync(join(dir, "pubsub.ts"), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  );
  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (name === "sasat")
        return { createPubSub: () => createPubSub({ backend: "local" }) };
      throw new Error(`Unexpected generated import: ${name}`);
    },
  });
  const receive = jest.fn();
  await exports.pubsub.subscribe("event", receive, {});
  await exports.pubsub.publish("event", { value: 1 });
  expect(receive).toHaveBeenCalledWith({ value: 1 });
  await exports.pubsub.close();
});

test("rejects tables without a primary key", () => {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("invalid", (table) => table.column("name").text());
  expect(() => parse(new DataStoreHandler(store.serialize()))).toThrow(
    "Table: invalid has no primary key.",
  );
});

test("generated mutations call overrides on the user datasource subclass", async () => {
  await new CodeGen_v2(fixture()).generate();
  class GeneratedUserDBDataSource {
    create(_input: unknown): unknown {
      throw new Error("Base create must be overridden");
    }
    update(_input: unknown): unknown {
      throw new Error("Base update must be overridden");
    }
    delete(_input: unknown): unknown {
      throw new Error("Base delete must be overridden");
    }
    findById(_id: number): unknown {
      throw new Error("Base findById must be overridden");
    }
  }
  const saved = { id: 1, name: "custom result" };
  class UserDBDataSource extends GeneratedUserDBDataSource {
    override create = jest.fn().mockResolvedValue(saved);
    override update = jest.fn().mockResolvedValue({ changedRows: 1 });
    override delete = jest.fn().mockResolvedValue({ affectedRows: 1 });
    override findById = jest.fn().mockResolvedValue(saved);
    constructor() {
      super();
      instances.push(this);
    }
  }
  const instances: UserDBDataSource[] = [];
  const publishUserCreated = jest.fn();
  const exports = {} as {
    mutation: Record<string, (...args: unknown[]) => Promise<unknown>>;
  };
  const code = ts.transpileModule(
    readFileSync(join(dir, "__generated__/mutation.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  runInNewContext(code.outputText, {
    exports,
    require: (name: string) => {
      if (name === "../dataSources/db/User.js") return { UserDBDataSource };
      if (name === "../dataSources/db/Post.js") return {};
      if (name === "sasat") return { makeResolver, pick, publishAfterWrite };
      if (name === "../middlewares.js")
        return { auth: (args: unknown) => args };
      if (name === "../idEncoder.js") return { UserHashId: { decode: Number } };
      if (name === "./subscription.js") return { publishUserCreated };
      throw new Error(`Unexpected generated import: ${name}`);
    },
  });
  await expect(
    exports.mutation.createUser(null, { user: { name: "input" } }, {}),
  ).resolves.toEqual(saved);
  expect(instances[0].create).toHaveBeenCalledWith({ name: "input" });
  expect(instances[0].findById).toHaveBeenCalledWith(
    1,
    undefined,
    undefined,
    {},
  );
  expect(publishUserCreated).toHaveBeenCalledWith(saved);
  await expect(
    exports.mutation.updateUser(
      null,
      { user: { id: "1", name: "updated" } },
      {},
    ),
  ).resolves.toEqual(saved);
  expect(instances[1].update).toHaveBeenCalledWith({ id: 1, name: "updated" });
  expect(instances[1].findById).toHaveBeenCalledWith(
    1,
    undefined,
    undefined,
    {},
  );
  await expect(
    exports.mutation.deleteUser(null, { user: { id: "1" } }, {}),
  ).resolves.toBe(true);
  expect(instances[2].delete).toHaveBeenCalledWith({ id: 1 });
});

test("generated relation resolvers use the owning relation map and GraphQL context", async () => {
  await new CodeGen_v2(fixture()).generate();
  const parentCondition = jest.fn().mockReturnValue("parent condition");
  const childCondition = jest.fn().mockReturnValue("child condition");
  const first = jest.fn().mockResolvedValue({ id: 1 });
  const find = jest.fn().mockResolvedValue([{ id: 2 }]);
  class UserDBDataSource {
    getRelationMap() {
      return { posts: { condition: childCondition } };
    }
    first = first;
  }
  class PostDBDataSource {
    getRelationMap() {
      return { user: { condition: parentCondition } };
    }
    find = find;
  }
  type Resolver = (
    parent: Record<string, unknown>,
    args: unknown,
    context: unknown,
  ) => unknown;
  const exports = {} as {
    resolvers: { User: { posts: Resolver }; Post: { user: Resolver } };
  };
  const code = ts.transpileModule(
    readFileSync(join(dir, "__generated__/resolver.ts"), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  );
  runInNewContext(code.outputText, {
    exports,
    require: (name: string) => {
      if (name === "sasat") return { numericScalarResolvers };
      if (name.includes("typeDefs")) return { typeDefs: {}, inputs: {} };
      if (name.includes("dataSources/db/User")) return { UserDBDataSource };
      if (name.includes("dataSources/db/Post")) return { PostDBDataSource };
      if (
        /^\.\/(query|mutation|subscription)(\.js)?$/.test(name) ||
        name.includes("idEncoder")
      )
        return {};
      throw new Error(`Unexpected generated import: ${name}`);
    },
  });
  const context = { tenantId: "tenant" };
  const user = { id: 1 };
  const post = { id: 2, userId: 1 };
  await expect(
    exports.resolvers.User.posts(user, {}, context),
  ).resolves.toEqual([{ id: 2 }]);
  await expect(exports.resolvers.Post.user(post, {}, context)).resolves.toEqual(
    { id: 1 },
  );
  expect(childCondition).toHaveBeenCalledWith({
    parent: user,
    childTableAlias: "t0",
    context,
  });
  expect(parentCondition).toHaveBeenCalledWith({
    parent: post,
    childTableAlias: "t0",
    context,
  });
  expect(find).toHaveBeenCalledWith(
    undefined,
    { where: "child condition" },
    context,
  );
  expect(first).toHaveBeenCalledWith(
    undefined,
    { where: "parent condition" },
    context,
  );
  first.mockClear();
  find.mockClear();
  expect(
    exports.resolvers.User.posts({ ...user, posts: [] }, {}, context),
  ).toEqual([]);
  expect(exports.resolvers.Post.user({ ...post, user }, {}, context)).toBe(
    user,
  );
  expect(first).not.toHaveBeenCalled();
  expect(find).not.toHaveBeenCalled();
});

test.each([
  { filtered: false, field: "name", hashed: false },
  { filtered: true, field: "name", hashed: false },
  { filtered: true, field: "displayName", hashed: false },
  { filtered: true, field: "displayName", hashed: true },
])(
  "generated subscriptions deliver events with filtering=$filtered, field=$field, hashed=$hashed",
  async ({ filtered, field, hashed }) => {
    const UserHashId = makeNumberIdEncoder(new Hashids("users"));
    const store = fixture(field);
    if (filtered) {
      store.table(
        "user",
      ).gqlOption.mutations[0].subscription.subscriptionFilter = hashed
        ? ["id", "name"]
        : ["name"];
    }
    await new CodeGen_v2(store).generate();
    const code = readFileSync(
      join(dir, "__generated__/subscription.ts"),
      "utf8",
    );
    const pubsub = new PubSub();
    const exports = {} as {
      subscription: {
        UserCreated: {
          subscribe: (
            root?: unknown,
            args?: unknown,
          ) =>
            | AsyncIterableIterator<unknown>
            | Promise<AsyncIterableIterator<unknown>>;
        };
      };
      publishUserCreated: (entity: {
        id: number;
        [key: string]: string | number;
      }) => Promise<void>;
    };
    const compiled = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    });
    runInNewContext(compiled.outputText, {
      exports,
      require: (name: string) => {
        if (name === "graphql-subscriptions") return { withFilter };
        if (/^\.\.\/idEncoder(\.js)?$/.test(name)) return { UserHashId };
        if (name === "../pubsub" || name === "../pubsub.js") return { pubsub };
        throw new Error("Unexpected generated import: " + name);
      },
    });
    const iterator = await exports.subscription.UserCreated.subscribe(
      undefined,
      { name: "Ada", id: UserHashId.encode(2) },
    );
    try {
      expect(iterator[Symbol.asyncIterator]()).toBe(iterator);
      const next = iterator.next();
      if (hashed) {
        await exports.publishUserCreated({ id: 1, [field]: "Ada" });
        await exports.publishUserCreated({ id: 2, [field]: "Other" });
      }
      if (filtered)
        await exports.publishUserCreated({ id: 1, [field]: "Other" });
      await exports.publishUserCreated({ id: 2, [field]: "Ada" });
      await expect(next).resolves.toEqual({
        done: false,
        value: { UserCreated: { id: 2, [field]: "Ada" } },
      });
    } finally {
      await iterator.return?.();
    }
  },
);

test("disabling subscriptions removes generated publishers and imports while preserving custom pubsub", async () => {
  await new CodeGen_v2(fixture()).generate();
  const custom = "// user-owned pubsub; generation must preserve this file\n";
  writeFileSync(join(dir, "pubsub.ts"), custom);
  config().generator.gql.subscription = false;
  await new CodeGen_v2(fixture()).generate();
  expect(readFileSync(join(dir, "pubsub.ts"), "utf8")).toBe(custom);
  for (const file of ["mutation.ts", "resolver.ts", "subscription.ts"]) {
    const code = readFileSync(join(dir, "__generated__", file), "utf8");
    expect(code).not.toContain("publishUserCreated");
    expect(code).not.toContain("from '../pubsub");
    expect(code).not.toContain("from './subscription");
  }
});
