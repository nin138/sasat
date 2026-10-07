import { runInNewContext } from "node:vm";
import { buildSchema, graphql } from "graphql";
import Hashids from "hashids";
import ts from "typescript";
import { DataStoreHandler } from "../../../migration/dataStore.js";
import { StoreMigrator } from "../../../migration/front/storeMigrator.js";
import { Mutations } from "../../../migration/makeMutaion.js";
import { Queries } from "../../../migration/makeQuery.js";
import { createTypeDef } from "../../../runtime/createTypeDef.js";
import { gqlResolveInfoToField } from "../../../runtime/gqlResolveInfoToField.js";
import { makeNumberIdEncoder } from "../../../runtime/id.js";
import { makeResolver } from "../../../runtime/makeResolver.js";
import { publishAfterWrite } from "../../../runtime/publishAfterWrite.js";
import { pick } from "../../../runtime/util.js";
import { parse } from "../../parse.js";
import { generateMutationResolver } from "./generateMutationResolver.js";
import { generateTypeDefs } from "./generateTypeDefs.js";

function setup({
  renamed = true,
  refetch = false,
  subscription = false,
  hashed = false,
  clientHash = true,
  defaultContext = false,
} = {}) {
  const store = StoreMigrator.deserialize({ tables: [] });
  if (hashed)
    store.createTable("account", (table) => table.autoIncrementHashId("id"));
  const field = renamed ? "tenantId" : "tenant_id";
  const contextFields = [
    {
      column: "tenant_id",
      ...(defaultContext ? {} : { contextName: "currentTenant" }),
    },
  ];
  store.createTable("document", (table) => {
    table.column("id").int().primary().autoIncrement();
    table.column("title").varchar(40);
    if (hashed) {
      table
        .references({
          columnName: "tenant_id",
          parentTable: "account",
          parentColumn: "id",
          relation: "Many",
          fieldName: "tenant",
          parentFieldName: "documents",
        })
        .fieldName(field)
        .updatable(true);
      if (clientHash)
        table
          .references({
            columnName: "reviewer_id",
            parentTable: "account",
            parentColumn: "id",
            relation: "Many",
            fieldName: "reviewer",
            parentFieldName: "reviews",
          })
          .fieldName("reviewerId")
          .updatable(true);
    } else table.column("tenant_id").int().fieldName(field);
    table.enableGQL();
    table.addGQLQuery(Queries.primary());
    table.addGQLMutation(
      Mutations.create({ contextFields, noRefetch: !refetch, subscription }),
      Mutations.update({ contextFields, noRefetch: true }),
    );
  });
  const root = parse(new DataStoreHandler(store.serialize()));
  const create = jest.fn(async (input: Record<string, unknown>) => ({
    id: 7,
    ...input,
  }));
  const update = jest.fn(async (_input: Record<string, unknown>) => ({
    changedRows: 1,
  }));
  const fetched = { id: 7, title: "from database", [field]: 42 };
  const findById = jest.fn(async (_id: number) => fetched);
  const publishDocumentCreated = jest.fn(async (_entity: unknown) => {});
  const encoder = makeNumberIdEncoder(new Hashids("accounts"));
  const decode = jest.fn(encoder.decode);
  const exports = {} as {
    mutation: Record<string, (...args: unknown[]) => Promise<unknown>>;
  };
  runInNewContext(
    ts.transpileModule(generateMutationResolver(root).toString(), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === "sasat")
          return {
            makeResolver,
            pick,
            publishAfterWrite,
            gqlResolveInfoToField,
          };
        if (/dataSources\/db\/Document(\.js)?$/.test(name))
          return {
            DocumentDBDataSource: class {
              create = create;
              update = update;
              findById = findById;
            },
          };
        if (/idEncoder(\.js)?$/.test(name))
          return { AccountHashId: { decode } };
        if (/subscription(\.js)?$/.test(name))
          return { publishDocumentCreated };
        throw new Error("Unexpected generated import: " + name);
      },
    },
  );
  return {
    root,
    field,
    create,
    update,
    findById,
    fetched,
    publishDocumentCreated,
    encoder,
    decode,
    mutation: exports.mutation,
  };
}

test.each(
  [false, true].flatMap((renamed) =>
    [false, true].flatMap((refetch) =>
      [false, true].map((subscription) => ({ renamed, refetch, subscription })),
    ),
  ),
)("create merges authoritative context values: %j", async (options) => {
  const s = setup(options);
  const input = { title: "input", [s.field]: 999 };
  const result = await s.mutation.createDocument(
    null,
    { document: input },
    { currentTenant: 42 },
  );
  const saved = { id: 7, title: "input", [s.field]: 42 };
  expect(s.create).toHaveBeenCalledWith({ title: "input", [s.field]: 42 });
  expect(input[s.field]).toBe(999);
  expect(result).toEqual(options.refetch ? s.fetched : saved);
  if (options.refetch)
    expect(s.findById).toHaveBeenCalledWith(7, undefined, undefined, {
      currentTenant: 42,
    });
  else expect(s.findById).not.toHaveBeenCalled();
  if (options.subscription)
    expect(s.publishDocumentCreated).toHaveBeenCalledWith(
      options.refetch ? s.fetched : saved,
    );
  else expect(s.publishDocumentCreated).not.toHaveBeenCalled();
});

test("uses the original column as the default context key and preserves zero", async () => {
  const s = setup({ defaultContext: true });
  await s.mutation.createDocument(
    null,
    { document: { title: "zero" } },
    { tenant_id: 0 },
  );
  expect(s.create).toHaveBeenCalledWith({ title: "zero", tenantId: 0 });
});

test("update resolves renamed context columns and overrides caller values", async () => {
  const s = setup();
  await expect(
    s.mutation.updateDocument(
      null,
      { document: { id: 7, title: "updated", tenantId: 999 } },
      { currentTenant: 42 },
    ),
  ).resolves.toBe(true);
  expect(s.update).toHaveBeenCalledWith({
    id: 7,
    title: "updated",
    tenantId: 42,
  });
});

test.each(["create", "update"])(
  "%s decodes client hash IDs but never context-owned fields",
  async (method) => {
    const s = setup({ hashed: true });
    const reviewerId = s.encoder.encode(9);
    for (const forged of [false, true]) {
      s.decode.mockClear();
      const input = {
        ...(method === "update" ? { id: 7 } : {}),
        title: "hashed",
        reviewerId,
        ...(forged ? { tenantId: "not a valid hash!" } : {}),
      };
      await s.mutation[`${method}Document`](
        null,
        { document: input },
        { currentTenant: 42 },
      );
      expect(s[method as "create" | "update"]).toHaveBeenLastCalledWith({
        ...(method === "update" ? { id: 7 } : {}),
        title: "hashed",
        reviewerId: 9,
        tenantId: 42,
      });
      expect(s.decode).toHaveBeenCalledTimes(1);
      expect(s.decode).toHaveBeenCalledWith(reviewerId);
    }
  },
);

test("GraphQL hides context fields and creates with context alone", async () => {
  const s = setup();
  const exports = {} as {
    typeDefs: Parameters<typeof createTypeDef>[0];
    inputs: Parameters<typeof createTypeDef>[1];
  };
  runInNewContext(
    ts.transpileModule(generateTypeDefs(s.root).toString(), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports },
  );
  const schema = buildSchema(createTypeDef(exports.typeDefs, exports.inputs));
  const execute = (document: Record<string, unknown>) =>
    graphql({
      schema,
      source:
        "mutation($document: DocumentCreateInput!) { createDocument(document: $document) { id title tenantId } }",
      variableValues: { document },
      contextValue: { currentTenant: 42 },
      rootValue: {
        createDocument: (args: unknown, context: unknown, info: unknown) =>
          s.mutation.createDocument(null, args, context, info),
      },
    });
  const created = await execute({ title: "GraphQL" });
  expect(created.errors).toBeUndefined();
  expect(created.data).toEqual({
    createDocument: { id: 7, title: "GraphQL", tenantId: 42 },
  });
  s.create.mockClear();
  const forged = await execute({ title: "GraphQL", tenantId: 999 });
  expect(forged.errors).toHaveLength(1);
  expect(s.create).not.toHaveBeenCalled();
});

test("context-only hash references need no input decoder", async () => {
  const s = setup({ hashed: true, clientHash: false });
  await s.mutation.createDocument(
    null,
    { document: { title: "context hash" } },
    { currentTenant: 42 },
  );
  expect(s.create).toHaveBeenCalledWith({
    title: "context hash",
    tenantId: 42,
  });
  expect(s.decode).not.toHaveBeenCalled();
});

test.each(["create", "update"])(
  "%s preserves null and omitted hash references without calling a custom decoder",
  async (method) => {
    const s = setup({ hashed: true });
    for (const fields of [
      { reviewerId: null },
      {},
      { reviewerId: undefined },
    ]) {
      s.decode.mockClear();
      const input = {
        ...(method === "update" ? { id: 7 } : {}),
        title: "optional",
        ...fields,
      };
      await s.mutation[`${method}Document`](
        null,
        { document: input },
        { currentTenant: 0 },
      );
      expect(s.decode).not.toHaveBeenCalled();
      expect(s[method as "create" | "update"]).toHaveBeenLastCalledWith({
        ...input,
        reviewerId: fields.reviewerId,
        tenantId: 0,
      });
    }
  },
);

test.each(["create", "update"])(
  "%s rejects bad client hash IDs before database operations",
  (method) => {
    const s = setup({ hashed: true });
    for (const reviewerId of ["", "!"]) {
      expect(() =>
        s.mutation[`${method}Document`](
          null,
          { document: { id: 7, title: "invalid", reviewerId } },
          { currentTenant: 42 },
        ),
      ).toThrow("Invalid Hash ID");
    }
    expect(s.create).not.toHaveBeenCalled();
    expect(s.update).not.toHaveBeenCalled();
    expect(s.findById).not.toHaveBeenCalled();
  },
);

test.each([false, true])(
  "mutation refetch passes selections and context (subscription=%s)",
  async (subscription) => {
    const s = setup({ refetch: true, subscription });
    const exports = {} as {
      typeDefs: Parameters<typeof createTypeDef>[0];
      inputs: Parameters<typeof createTypeDef>[1];
    };
    runInNewContext(
      ts.transpileModule(generateTypeDefs(s.root).toString(), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      { exports },
    );
    const schema = buildSchema(createTypeDef(exports.typeDefs, exports.inputs));
    const result = await graphql({
      schema,
      source:
        'mutation { createDocument(document:{title:"input"}) { alias:title } }',
      contextValue: { currentTenant: 42 },
      rootValue: {
        createDocument: (args: unknown, context: unknown, info: unknown) =>
          s.mutation.createDocument(null, args, context, info),
      },
    });
    expect(result.errors).toBeUndefined();
    expect(s.findById).toHaveBeenCalledWith(
      7,
      {
        fields: subscription ? ["id", "title", "tenantId"] : ["title"],
        relations: {},
        tableAlias: "t0",
      },
      undefined,
      { currentTenant: 42 },
    );
  },
);
