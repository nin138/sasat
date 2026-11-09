import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { GQLQuery } from "../../../migration/data/GQLOption.js";
import { DataStoreHandler } from "../../../migration/dataStore.js";
import { StoreMigrator } from "../../../migration/front/storeMigrator.js";
import { Conditions as C } from "../../../migration/makeCondition.js";
import { Queries } from "../../../migration/makeQuery.js";
import { QExpr as qe } from "../../../runtime/dsl/factory.js";
import { makeResolver } from "../../../runtime/makeResolver.js";
import { pagingOption } from "../../../runtime/pagingOption.js";
import { parse } from "../../parse.js";
import { generateQueryResolver } from "./generateQueryResolver.js";

function setup(query: GQLQuery, hashed = true, enabled = true) {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("account", (table) => {
    if (hashed) table.autoIncrementHashId("id");
    else table.column("id").int().primary();
    if (enabled) table.enableGQL();
    table.addGQLQuery(query);
  });
  const methods = {
    find: jest.fn(),
    first: jest.fn(),
    findById: jest.fn(),
    findPageable: jest.fn(),
  };
  const fields = { fields: ["id"], relations: {}, tableAlias: "t0" };
  const gqlResolveInfoToField = jest.fn(() => fields);
  const decode = jest.fn((value: string) => {
    if (!value.startsWith("hash:")) throw new Error("Invalid Hash ID");
    return Number(value.slice(5));
  });
  const authorize = jest.fn((args: unknown[]) => args);
  const exports = {} as {
    query: Record<string, (...args: unknown[]) => Promise<unknown>>;
  };
  runInNewContext(
    ts.transpileModule(
      generateQueryResolver(
        parse(new DataStoreHandler(store.serialize())),
      ).toString(),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === "sasat")
          return { qe, makeResolver, pagingOption, gqlResolveInfoToField };
        if (/dataSources\/db\/Account(\.js)?$/.test(name))
          return {
            AccountDBDataSource: class {
              find = methods.find;
              first = methods.first;
              findById = methods.findById;
              findPageable = methods.findPageable;
            },
          };
        if (/idEncoder(\.js)?$/.test(name))
          return { AccountHashId: { decode } };
        if (/middlewares(\.js)?$/.test(name)) return { authorize };
        throw new Error(`Unexpected generated import: ${name}`);
      },
    },
  );
  return {
    ...methods,
    fields,
    decode,
    authorize,
    gqlResolveInfoToField,
    query: exports.query[query.type === "primary" ? "account" : query.name],
    queries: exports.query,
  };
}

test("primary query decodes IDs before user middleware and leaves caller args unchanged", async () => {
  const s = setup(Queries.primary(["authorize"]));
  const args = Object.freeze({ id: "hash:42" });
  const context = { tenant: 7 };
  const info = {};
  s.findById.mockResolvedValue({ id: 42 });
  await expect(s.query(null, args, context, info)).resolves.toEqual({ id: 42 });
  expect(s.authorize.mock.calls[0][0][1]).toEqual({ id: 42 });
  expect(s.findById).toHaveBeenCalledWith(42, s.fields, undefined, context);
  expect(s.gqlResolveInfoToField).toHaveBeenCalledWith(info);
  expect(args.id).toBe("hash:42");
});
test("invalid primary ID stops middleware and database access", () => {
  const s = setup(Queries.primary(["authorize"]));
  expect(() => s.query(null, { id: "bad" }, {})).toThrow("Invalid Hash ID");
  expect(s.authorize).not.toHaveBeenCalled();
  expect(s.findById).not.toHaveBeenCalled();
});
test.each([true, false])(
  "comparison query decodes a hash argument on either side (left=%s)",
  async (left) => {
    const arg = C.value.arg("key", "ID");
    const field = C.value.field("id");
    const s = setup(
      Queries.single("lookup", {
        conditions: [
          C.query.comparison(left ? arg : field, ">", left ? field : arg),
        ],
      }),
    );
    await s.query(null, { key: "hash:3" }, {});
    expect(s.first).toHaveBeenCalledWith(
      s.fields,
      {
        where: qe.and(
          qe.comparison(
            left ? qe.value(3) : qe.field("t0", "id"),
            ">",
            left ? qe.field("t0", "id") : qe.value(3),
          ),
        ),
      },
      {},
    );
  },
);
test("range query decodes both boundaries and forwards paging and context", async () => {
  const s = setup(
    Queries.paging("accounts", {
      conditions: [
        C.query.between(
          C.value.field("id"),
          C.value.arg("begin", "String"),
          C.value.arg("end", "ID"),
        ),
      ],
    }),
  );
  const option = { numberOfItem: 2, offset: 0, order: "id", asc: false };
  const context = { tenant: 0 };
  await s.query(null, { begin: "hash:2", end: "hash:9", option }, context);
  expect(s.decode.mock.calls).toEqual([["hash:2"], ["hash:9"]]);
  expect(s.findPageable).toHaveBeenCalledWith(
    pagingOption(option),
    s.fields,
    {
      where: qe.and(qe.between(qe.field("t0", "id"), qe.value(2), qe.value(9))),
    },
    context,
  );
});
test.each([true, false])(
  "numeric query args are forwarded without ID decoding (hashed=%s)",
  async (hashed) => {
    const s = setup(
      Queries.listAll("accounts", {
        conditions: [
          C.query.comparison(
            C.value.field("id"),
            "=",
            C.value.arg("id", "Int"),
          ),
        ],
        middlewares: ["authorize"],
      }),
      hashed,
    );
    await s.query(null, { id: 0 }, {});
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.authorize).toHaveBeenCalledTimes(1);
    expect(s.find).toHaveBeenCalledWith(
      s.fields,
      { where: qe.and(qe.comparison(qe.field("t0", "id"), "=", qe.value(0))) },
      {},
    );
  },
);
test.each([undefined, {}, { tenant: 0 }])(
  "query conditions read the resolver context and apply defaults: %j",
  async (context) => {
    const s = setup(
      Queries.listAll("accounts", {
        conditions: [
          C.query.comparison(
            C.value.field("id"),
            "=",
            C.value.contextOrDefault("tenant", 8),
          ),
        ],
      }),
    );
    await s.query(null, {}, context);
    expect(s.find).toHaveBeenCalledWith(
      s.fields,
      {
        where: qe.and(
          qe.comparison(
            qe.field("t0", "id"),
            "=",
            qe.value(context?.tenant ?? 8),
          ),
        ),
      },
      context,
    );
  },
);
test("entities closed to GraphQL do not expose queries", () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  expect(setup(Queries.primary(), true, false).queries).toEqual({});
});

test.each(["left", "right", "begin", "end"])(
  "required query context at %s fails before database access and accepts zero",
  async (position) => {
    const required = C.value.contextOrError("tenant", "tenant required");
    const field = C.value.field("id");
    const condition =
      position === "left" || position === "right"
        ? C.query.comparison(
            position === "left" ? required : field,
            "=",
            position === "right" ? required : field,
          )
        : C.query.between(
            field,
            position === "begin" ? required : C.value.fixed(0),
            position === "end" ? required : C.value.fixed(100),
          );
    const s = setup(Queries.listAll("accounts", { conditions: [condition] }));
    for (const context of [undefined, {}])
      await expect(s.query(null, {}, context)).rejects.toThrow(
        "tenant required",
      );
    expect(s.find).not.toHaveBeenCalled();
    await s.query(null, {}, { tenant: 0 });
    expect(s.find).toHaveBeenCalledTimes(1);
  },
);
