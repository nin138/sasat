import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { runInNewContext } from "node:vm";
import { buildSchema, graphql } from "graphql";
import {
  type Connection,
  createConnection,
  type RowDataPacket,
} from "mysql2/promise";
import ts from "typescript";
import type {
  CommandResponse,
  SQLExecutor,
} from "../../src/db/connectors/dbClient.js";
import { getDbClient } from "../../src/db/getDbClient.js";
import { generateQueryResolver } from "../../src/generatorv2/codegen/ts/generateQueryResolver.js";
import { parse } from "../../src/generatorv2/parse.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Conditions } from "../../src/migration/makeCondition.js";
import { Queries } from "../../src/migration/makeQuery.js";
import { QExpr as q } from "../../src/runtime/dsl/factory.js";
import type { Fields } from "../../src/runtime/field.js";
import { gqlResolveInfoToField } from "../../src/runtime/gqlResolveInfoToField.js";
import { makeResolver } from "../../src/runtime/makeResolver.js";
import { pagingOption } from "../../src/runtime/pagingOption.js";
import { SasatDBDatasource } from "../../src/runtime/sasatDBDatasource.js";

const options = {
  host: process.env.TEST_DB_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT ?? 3308),
  user: process.env.TEST_DB_USER ?? "root",
  password: process.env.TEST_DB_PASSWORD ?? "",
  connectTimeout: 5_000,
};
const database = `sasat_it_${randomUUID().replaceAll("-", "")}`;
let connection: Connection | undefined;
let created = false;
before(async () => {
  connection = await createConnection(options);
  // Only create/drop this run's unique database; never use DATABASE or DB_NAME.
  await connection.query("CREATE DATABASE ??", [database]);
  created = true;
  await connection.query("USE ??", [database]);
  await connection.query(
    "CREATE TABLE scope (id INT PRIMARY KEY, tenant_id INT, active INT, visible INT, marker INT DEFAULT 0)",
  );
  await connection.query(
    "CREATE TABLE child (id INT PRIMARY KEY, scope_id INT)",
  );
  await connection.query(
    "INSERT INTO scope (id, tenant_id, active, visible) VALUES (1,2,0,1),(2,1,1,0),(3,1,0,1),(4,2,1,1),(5,1,1,1),(6,1,0,0)",
  );
  await connection.query("INSERT INTO child VALUES (31,3),(32,3)");
});
after(async () => {
  if (!connection) return;
  try {
    if (created) await connection.query("DROP DATABASE ??", [database]);
  } finally {
    await connection.end();
  }
});

const executor: SQLExecutor = {
  rawQuery: async (sql) =>
    (await connection!.query(sql))[0] as Awaited<
      ReturnType<SQLExecutor["rawQuery"]>
    >,
  rawCommand: async (sql) =>
    (await connection!.query(sql))[0] as CommandResponse,
};
type Scope = {
  id: number;
  tenantId: number;
  active: number;
  visible: number;
  marker: number;
};
class ScopeDBDataSource extends SasatDBDatasource<
  Scope,
  { id: number },
  Scope,
  Partial<Scope> & { id: number },
  Fields<Scope>,
  Scope
> {
  tableName = "scope";
  fields = ["id", "tenantId", "active", "visible", "marker"];
  primaryKeys = ["id"];
  identifyFields = ["id"];
  autoIncrementColumn = undefined;
  tableInfo = {
    scope: {
      identifiableKeys: ["id"],
      identifiableFields: ["id"],
      columnMap: {
        id: "id",
        tenantId: "tenant_id",
        active: "active",
        visible: "visible",
        marker: "marker",
      },
    },
    child: {
      identifiableKeys: ["id"],
      identifiableFields: ["id"],
      columnMap: { id: "id", scopeId: "scope_id" },
    },
  };
  relationMap = {
    scope: {
      children: {
        table: "child",
        array: true,
        nullable: true,
        requiredColumns: ["id"],
        condition: ({
          parentTableAlias,
          childTableAlias,
        }: {
          parentTableAlias?: string;
          childTableAlias: string;
        }) =>
          q.eq(
            q.field(parentTableAlias!, "id"),
            q.field(childTableAlias, "scope_id"),
          ),
      },
    },
    child: {},
  };
  constructor() {
    super(executor);
  }
  getDefaultValueString() {
    return {};
  }
}

const allowed = (alias: string) =>
  q.or(
    q.eq(q.field(alias, "active"), q.value(1)),
    q.eq(q.field(alias, "visible"), q.value(1)),
  );
const tenant = (alias: string) => q.eq(q.field(alias, "tenant_id"), q.value(1));

test("filters the parent page before OFFSET and keeps all selected children", async () => {
  const result = await new ScopeDBDataSource().findPageable(
    {
      numberOfItem: 1,
      offset: 1,
      where: allowed("t0"),
      sort: [q.sort(q.field("t0", "id"), "ASC")],
    },
    { fields: ["id"], relations: { children: { fields: ["id"] } } },
    { where: tenant("t0"), lock: "FOR UPDATE" },
  );
  assert.deepEqual(
    result.map((row) => row.id),
    [3],
  );
  const children = (result[0] as Scope & { children: { id: number }[] })
    .children;
  assert.deepEqual(
    children.map((child) => child.id).sort((a, b) => a - b),
    [31, 32],
  );
});

test("a generated GraphQL paging resolver applies its configured condition", async () => {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("scope", (table) => {
    table.column("id").int().primary();
    table.column("tenant_id").int().fieldName("tenantId");
    table.enableGQL();
    table.addGQLQuery(
      Queries.paging("scopes", {
        conditions: [
          Conditions.query.comparison(
            Conditions.value.field("tenant_id"),
            "=",
            Conditions.value.arg("tenant", "Int"),
          ),
        ],
      }),
    );
  });
  const code = generateQueryResolver(
    parse(new DataStoreHandler(store.serialize())),
  ).toString();
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {} as { query: { scopes: (...args: unknown[]) => unknown } };
  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (name === "sasat")
        return { makeResolver, gqlResolveInfoToField, pagingOption, qe: q };
      if (name.includes("dataSources/db/Scope")) return { ScopeDBDataSource };
      throw new Error("Unexpected generated import: " + name);
    },
  });
  const schema = buildSchema(
    "input PagingOption { numberOfItem: Int!, offset: Int, order: String } type Scope { id: Int! } type Query { scopes(tenant: Int!, option: PagingOption!): [Scope!]! }",
  );
  const result = await graphql({
    schema,
    source:
      '{ scopes(tenant: 1, option: {numberOfItem: 1, offset: 1, order: "id"}) { id } }',
    rootValue: {
      scopes: (args: unknown, context: unknown, info: unknown) =>
        exports.query.scopes(null, args, context, info),
    },
  });
  assert.equal(result.errors, undefined);
  assert.equal(JSON.stringify(result.data), '{"scopes":[{"id":3}]}');
});

test("rejects switching a live shared pool to a different database", async () => {
  const first = getDbClient({ ...options, database });
  try {
    assert.throws(
      () => getDbClient({ ...options, database: database + "_other" }),
      /already initialized with different settings/,
    );
    const rows = await first.rawQuery("SELECT DATABASE() AS db");
    assert.equal(rows[0].db, database);
    assert.equal(getDbClient(), first);
  } finally {
    await first.release();
  }
});

test("nested AND/OR restricts updates and deletes to the intended tenant", async () => {
  const ds = new ScopeDBDataSource();
  const where = q.and(tenant("scope"), allowed("scope"));
  const updated = await ds.updateWhere({ marker: 1 }, where);
  assert.equal(updated.affectedRows, 3);
  const [marked] = await connection!.query<RowDataPacket[]>(
    "SELECT id FROM scope WHERE marker = 1 ORDER BY id",
  );
  assert.deepEqual(
    marked.map((row) => row.id),
    [2, 3, 5],
  );
  const deleted = await ds.deleteWhere(where);
  assert.equal(deleted.affectedRows, 3);
  const [remaining] = await connection!.query<RowDataPacket[]>(
    "SELECT id FROM scope ORDER BY id",
  );
  assert.deepEqual(
    remaining.map((row) => row.id),
    [1, 4, 6],
  );
});
