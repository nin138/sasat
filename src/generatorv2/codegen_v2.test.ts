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
import ts from "typescript";
import { config } from "../config/config.js";
import { DataStoreHandler } from "../migration/dataStore.js";
import { StoreMigrator } from "../migration/front/storeMigrator.js";
import { Mutations } from "../migration/makeMutaion.js";
import { Queries } from "../migration/makeQuery.js";
import { createTypeDef } from "../runtime/createTypeDef.js";
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

function fixture() {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("user", (table) => {
    table.autoIncrementHashId("id", { salt: "users" });
    table.column("name").varchar(80);
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
  writeFileSync(join(dir, "__generated__/obsolete.ts"), "obsolete");
  await generator.generate();
  expect(readFileSync(custom, "utf8")).toBe(edited);
  expect(readFileSync(middleware, "utf8")).toBe(originalMiddleware);
  expect(existsSync(join(dir, "__generated__/obsolete.ts"))).toBe(false);
});

test("rejects tables without a primary key", () => {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("invalid", (table) => table.column("name").text());
  expect(() => parse(new DataStoreHandler(store.serialize()))).toThrow(
    "Table: invalid has no primary key.",
  );
});

test.each([false, true])(
  "generated subscriptions deliver events with filtering=%s",
  async (filtered) => {
    const store = fixture();
    if (filtered) {
      store.table(
        "user",
      ).gqlOption.mutations[0].subscription.subscriptionFilter = ["name"];
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
        name: string;
      }) => Promise<void>;
    };
    const compiled = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    });
    runInNewContext(compiled.outputText, {
      exports,
      require: (name: string) => {
        if (name === "graphql-subscriptions") return { withFilter };
        if (name === "../pubsub" || name === "../pubsub.js") return { pubsub };
        throw new Error("Unexpected generated import: " + name);
      },
    });
    const iterator = await exports.subscription.UserCreated.subscribe(
      undefined,
      { name: "Ada" },
    );
    try {
      expect(iterator[Symbol.asyncIterator]()).toBe(iterator);
      const next = iterator.next();
      if (filtered) await exports.publishUserCreated({ id: 1, name: "Other" });
      await exports.publishUserCreated({ id: 2, name: "Ada" });
      await expect(next).resolves.toEqual({
        done: false,
        value: { UserCreated: { id: 2, name: "Ada" } },
      });
    } finally {
      await iterator.return?.();
    }
  },
);
