import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";
import { graphql } from "graphql";
import { createSchema } from "graphql-yoga";
import { config, setConfig } from "../../src/config/config.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import { getDbClient } from "../../src/db/getDbClient.js";
import { readPostgresSchema } from "../../src/db/sql/postgresSchema.js";
import { createSqlGenerator } from "../../src/db/sqlGenerator.js";
import { CodeGen_v2 } from "../../src/generatorv2/codegen_v2.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { getCurrentMigration } from "../../src/migration/exec/getCurrentMigration.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Mutations } from "../../src/migration/makeMutaion.js";
import { Queries } from "../../src/migration/makeQuery.js";
import { QExpr } from "../../src/runtime/dsl/factory.js";
import { SasatDBDatasource } from "../../src/runtime/sasatDBDatasource.js";
import { makeTestDB } from "../../src/testing/makeTestDB.js";
import { PostgresTestDBClient } from "../../src/testing/postgresTestDBClient.js";
import { verifyBulkInsert } from "../integration/bulk-insert-cases.js";
import { verifyPublishFailure } from "../integration/publish-failure-cases.js";

const settings = {
  host: process.env.TEST_PG_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_PG_PORT ?? 5432),
  user: process.env.TEST_PG_USER ?? "postgres",
  password: process.env.TEST_PG_PASSWORD ?? "",
};
const database = `sasat_pg_${randomUUID().replaceAll("-", "")}`;
const admin = new PostgresClient({ ...settings, database: "postgres" });
let client: PostgresClient;
let scratch: string;
const q = (name: string) => createSqlGenerator("postgres").escapeId(name);
const options = {
  silent: true,
  dry: true,
  generateFiles: false,
  skipBuild: true,
};

class Accounts extends SasatDBDatasource<
  { id: number; name: string },
  { id: number },
  { name: string; id?: number },
  { id: number; name?: string },
  { fields: ("id" | "name")[] },
  { id: number; name: string }
> {
  tableName = "account";
  fields = ["id", "name"];
  primaryKeys = ["accountId"];
  identifyFields = ["id"];
  autoIncrementColumn = "id";
  relationMap = { account: {} };
  tableInfo = {
    account: {
      identifiableKeys: ["accountId"],
      identifiableFields: ["id"],
      columnMap: { id: "accountId", name: "name" },
    },
  };
  getDefaultValueString() {
    return {};
  }
}

before(
  async () => {
    scratch = mkdtempSync(path.join(tmpdir(), "sasat-postgres-"));
    mkdirSync(path.join(scratch, "migrations"));
    writeFileSync(
      path.join(scratch, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    // Resolve generated sasat imports through the real package exports.
    mkdirSync(path.join(scratch, "node_modules"));
    symlinkSync(process.cwd(), path.join(scratch, "node_modules/sasat"));
    for (const name of readdirSync(path.resolve("node_modules"))) {
      if (name !== "sasat" && name !== ".bin")
        symlinkSync(
          path.resolve("node_modules", name),
          path.join(scratch, "node_modules", name),
        );
    }
    await admin.rawQuery(`CREATE DATABASE ${q(database)}`);
    client = new PostgresClient({ ...settings, database });
    setConfig({
      db: { ...settings, database, dialect: "postgres" },
      migration: {
        table: "__migrate__",
        dir: path.relative(process.cwd(), path.join(scratch, "migrations")),
        out: path.join(scratch, "out"),
      },
      generator: { addJsExtToImportStatement: true },
    });
  },
  { timeout: 20000 },
);

after(async () => {
  if (client) await client.release();
  await getDbClient().release();
  await admin.rawQuery(`DROP DATABASE IF EXISTS ${q(database)}`);
  await admin.release();
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

test("dry run on a fresh PostgreSQL database does not create history", async () => {
  assert.equal(await getCurrentMigration(client, options), undefined);
  assert.deepEqual(
    await client.rawQuery(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
    ),
    [],
  );
  await getCurrentMigration(client, { ...options, dry: false });
  assert.equal(
    (await client.rawQuery('SELECT * FROM "__migrate__"')).length,
    0,
  );
});

test("applies identity, references, indexes and automatic update timestamps", async () => {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("account", (t) => {
    t.column("accountId").int().primary().autoIncrement().fieldName("id");
    t.column("name").varchar(120).unique();
    t.createdAt();
    t.updatedAt();
    t.addIndex("name");
    t.enableGQL();
    t.addGQLQuery(Queries.primary(), Queries.paging("accounts"));
    t.addGQLMutation(
      Mutations.create(),
      Mutations.update({ noRefetch: true }),
      Mutations.delete(),
    );
  });
  store.createTable("message", (t) => {
    t.autoIncrementHashId("id");
    t.column("body").text();
    t.references({
      columnName: "ownerId",
      parentTable: "account",
      parentColumn: "accountId",
      relation: "Many",
      fieldName: "owner",
      parentFieldName: "messages",
    });
    t.enableGQL();
    t.addGQLQuery(Queries.primary());
    t.addGQLMutation(Mutations.create({ subscription: true }));
  });
  const tx = await client.transaction();
  try {
    for (const sql of store.getSql()) await tx.rawQuery(sql);
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
  const ds = new Accounts(client);
  const name = "O'Reilly\\'; DROP TABLE account; --";
  const created = await ds.create({ name });
  assert.equal(created.id, 1);
  assert.equal((await ds.find())[0].name, name);
  const time = (await client.rawQuery('SELECT "updatedAt" FROM account'))[0]
    .updatedAt;
  await client.rawQuery("SELECT pg_sleep(0.02)");
  await ds.update({ id: 1, name: "renamed" });
  const next = (await client.rawQuery('SELECT "updatedAt" FROM account'))[0]
    .updatedAt;
  assert.equal(typeof next, "string");
  assert.notEqual(time, next);
  await assert.rejects(
    () =>
      client.rawQuery(
        "INSERT INTO message (body,\"ownerId\") VALUES ('x',9999)",
      ),
    /foreign key/,
  );
  await new CodeGen_v2(new DataStoreHandler(store.serialize())).generate();
});

test("CRUD, bulk, both conflict targets, transactions, paging and locks", async () => {
  const ds = new Accounts(client);
  const row = await ds.upsert({ id: 1, name: "upserted" }, ["name"]);
  assert.equal(row.id, 1);
  const unique = await ds.upsert({ name: "upserted" }, ["name"], ["name"]);
  assert.equal(unique.id, 1);
  assert.equal(
    (await ds.createBulk([{ name: "second" }, { name: "third" }]))
      ?.affectedRows,
    2,
  );
  assert.equal(
    (await ds.createBulk([{ name: "second" }], { ignore: true }))?.affectedRows,
    0,
  );
  assert.deepEqual(await ds.find(undefined, { limit: 0 }), []);
  const page = await ds.findPageable({
    numberOfItem: 1,
    sort: [QExpr.sort(QExpr.field("t0", "accountId"), "ASC")],
  });
  assert.equal(page.length, 1);
  const tx = await client.transaction();
  await new Accounts(tx).create({ name: "rollback" });
  await tx.rollback();
  assert.equal(
    (
      await ds.find(undefined, {
        where: QExpr.eq(QExpr.field("t0", "name"), QExpr.value("rollback")),
      })
    ).length,
    0,
  );
  const lock = await client.transaction();
  assert.equal(
    (await new Accounts(lock).find(undefined, { limit: 1, lock: "FOR UPDATE" }))
      .length,
    1,
  );
  assert.equal(
    (
      await new Accounts(lock).findPageable({ numberOfItem: 1 }, undefined, {
        lock: "FOR SHARE",
      })
    ).length,
    1,
  );
  await lock.commit();
  const removed = await ds.create({ name: "remove" });
  assert.equal((await ds.delete({ id: removed.id })).affectedRows, 1);
  assert.equal((await ds.delete({ id: removed.id })).affectedRows, 0);
});

test("generated GraphQL creates Hash IDs and returns nested paged relations", async () => {
  // The generated files import the built package, whose config is independent of source imports.
  const runtime = (await import(
    pathToFileURL(path.resolve("dist/index.mjs")).href
  )) as typeof import("../../src/index.js");
  runtime.setConfig({ db: { ...settings, database, dialect: "postgres" } });
  const generated = await import(
    pathToFileURL(path.join(scratch, "out/schema.ts")).href
  );
  const schema = createSchema(generated.schema);
  try {
    const created = await graphql({
      schema,
      source:
        'mutation { createMessage(message: {body:"hello", ownerId:1}) { id body owner { id name } } }',
    });
    assert.equal(created.errors, undefined, JSON.stringify(created.errors));
    const entity = (created.data as { createMessage: { id: string } })
      .createMessage;
    assert.equal(typeof entity.id, "string");
    assert.ok(entity.id.length > 0);
    const result = await graphql({
      schema,
      source:
        '{ accounts(option: {numberOfItem:1,order:"accountId"}) { id name messages { id body } } }',
    });
    assert.equal(result.errors, undefined, JSON.stringify(result.errors));
    assert.equal(
      (result.data as { accounts: { messages: unknown[] }[] }).accounts[0]
        .messages.length,
      1,
    );
  } finally {
    await runtime.getDbClient().release();
  }
});

test("imports a PostgreSQL schema and alters quoted columns", async () => {
  const snapshot = await readPostgresSchema(client);
  assert.deepEqual(
    snapshot.tables.find((t) => t.tableName === "account")?.primaryKey,
    ["accountId"],
  );
  assert.ok(
    snapshot.tables
      .find((t) => t.tableName === "account")
      ?.indexes.some((i) => i.columns.includes("name")),
  );
  assert.equal(
    snapshot.tables
      .find((t) => t.tableName === "message")
      ?.columns.find((c) => c.columnName === "ownerId")?.hasReference,
    true,
  );
  const store = StoreMigrator.deserialize(snapshot);
  store
    .table("account")
    .addColumn("extraValue", (c) => c.varchar(50).nullable())
    .setDefault("extraValue", "default")
    .changeColumnType("extraValue", "text");
  for (const sql of store.getSql()) await client.rawQuery(sql);
  store.resetQueue();
  store.table("account").dropColumn("extraValue");
  for (const sql of store.getSql()) await client.rawQuery(sql);
});

test("temporary PostgreSQL test clients create and drop their isolated database", async () => {
  const name = `sasat_pg_helper_${randomUUID().replaceAll("-", "")}`;
  const testClient = await PostgresTestDBClient.create({
    ...settings,
    database: name,
    dialect: "postgres",
  });
  await testClient.rawQuery("CREATE TABLE checked(id integer)");
  await testClient.release();
  assert.deepEqual(
    await admin.query`SELECT datname FROM pg_database WHERE datname=${name}`,
    [],
  );
});

test("CLI dry, apply, generated output and down use the configured PostgreSQL dialect", async () => {
  const dir = path.join(scratch, "cli");
  mkdirSync(path.join(dir, "migrations"), { recursive: true });
  symlinkSync(
    path.join(scratch, "node_modules"),
    path.join(dir, "node_modules"),
  );
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  writeFileSync(
    path.join(dir, "sasat.yml"),
    `db:\n  dialect: postgres\n  host: $TEST_PG_HOST\n  port: $TEST_PG_PORT\n  user: $TEST_PG_USER\n  password: $TEST_PG_PASSWORD\n  database: ${database}\nmigration:\n  dir: migrations\n  out: out\n  table: cli_history\ngenerator:\n  addJsExtToImportStatement: true\n`,
  );
  writeFileSync(
    path.join(dir, "migrations/001.ts"),
    "export default class { up() {} down() {} }",
  );
  writeFileSync(
    path.join(dir, "migrations/002.ts"),
    'export default class { up(s) { s.createTable("CliTable", t => {t.autoIncrementHashId("id");t.column("title").text();}); } down(s) {s.dropTable("CliTable");} }',
  );
  const env = {
    ...process.env,
    TEST_PG_HOST: settings.host,
    TEST_PG_PORT: String(settings.port),
    TEST_PG_USER: settings.user,
    TEST_PG_PASSWORD: settings.password,
  };
  const cli = path.resolve("dist/cli/index.mjs");
  const run = (...args: string[]) =>
    execFileSync(process.execPath, [cli, ...args], {
      cwd: dir,
      env,
      encoding: "utf8",
      timeout: 20000,
    });
  assert.match(
    run("migrate", "--dry", "--generateFiles"),
    /GENERATED BY DEFAULT AS IDENTITY/,
  );
  assert.match(run("migrate", "--generateFiles"), /current migration/);
  const migrationDir = config().migration.dir;
  setConfig({ migration: { dir: path.join(dir, "migrations") } });
  try {
    const isolated = await makeTestDB({ ...settings, database: "unused" });
    try {
      assert.equal(isolated.dialect, "postgres");
      const rows = await isolated.rawQuery(
        `INSERT INTO "CliTable" (title) VALUES ('hello') RETURNING id`,
      );
      assert.equal(rows[0].id, 1);
    } finally {
      await isolated.release();
    }
  } finally {
    setConfig({ migration: { dir: migrationDir } });
  }
  writeFileSync(
    path.join(dir, "sasat.yml"),
    requireTarget(path.join(dir, "sasat.yml")),
  );
  assert.match(run("migrate"), /DROP TABLE "CliTable"/);
});

function requireTarget(file: string) {
  // Keep database credentials as environment references in temporary config files.
  return readFileSync(file, "utf8").replace(
    "  table: cli_history",
    "  table: cli_history\n  target: 001.ts",
  );
}

test("DDL and failed statements roll back together", async () => {
  const tx = await client.transaction();
  await tx.rawQuery('CREATE TABLE "rollback_ddl" (id integer PRIMARY KEY)');
  await tx.rawQuery('INSERT INTO "rollback_ddl" VALUES (1)');
  await assert.rejects(
    () => tx.rawQuery('INSERT INTO "rollback_ddl" VALUES (1)'),
    /unique constraint/,
  );
  await tx.rollback();
  assert.equal(
    (
      await client.rawQuery("SELECT to_regclass('public.rollback_ddl') AS name")
    )[0].name,
    null,
  );
});

test("preserves PostgreSQL scalar values without unsafe bigint rounding", async () => {
  const [row] = await client.rawQuery(
    "SELECT true AS active, 123::bigint AS small, 9223372036854775807::bigint AS large, 1.25::numeric AS amount, '2026-10-07'::date AS date",
  );
  assert.deepEqual(row, {
    active: true,
    small: 123,
    large: "9223372036854775807",
    amount: "1.25",
    date: "2026-10-07",
  });
});

test("schema imports reject indexes that cannot be represented", async () => {
  await client.rawQuery(
    'CREATE UNIQUE INDEX "unsupported_index" ON account(name) INCLUDE ("accountId")',
  );
  try {
    await assert.rejects(
      () => readPostgresSchema(client),
      /Cannot import.*INCLUDE/,
    );
  } finally {
    await client.rawQuery('DROP INDEX "unsupported_index"');
  }
});

test("client-owned generation survives opposite config in DDL, CRUD and transactions", async () => {
  const original = config().db.dialect ?? "mysql";
  const table = "generator_boundary";
  try {
    setConfig({ db: { dialect: "mysql" } });
    const store = StoreMigrator.deserialize({ tables: [] }, client.sql);
    store.createTable(table, (t) => {
      t.column("id").int().primary().autoIncrement();
      t.column("name").varchar(40);
    });
    for (const sql of store.getSql()) await client.rawQuery(sql);
    const tx = await client.transaction();
    assert.equal(tx.sql, client.sql);
    try {
      const result = await tx.rawCommand(
        tx.sql.create(
          {
            table,
            fields: ["name"],
            entities: [["O'Reilly"]],
            returning: "id",
          },
          {
            [table]: {
              identifiableKeys: ["id"],
              identifiableFields: ["id"],
              columnMap: { id: "id", name: "name" },
            },
          },
        ),
      );
      assert.equal(result.insertId, 1);
      assert.deepEqual(
        await tx.query`SELECT name FROM ${() => tx.sql.escapeId(table)} WHERE id = ${1}`,
        [{ name: "O'Reilly" }],
      );
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    store.resetQueue();
    store.table(table).setDefault("name", "guest");
    store.dropTable(table);
    for (const sql of store.getSql()) await client.rawQuery(sql);
  } finally {
    setConfig({ db: { dialect: original } });
    await client.rawQuery(`DROP TABLE IF EXISTS ${client.sql.escapeId(table)}`);
  }
});

test("bulk inserts preserve mixed fields, defaults, nulls, upserts and atomic failures", async () => {
  await verifyBulkInsert(client, "postgres");
});

test("generated mutations succeed after Redis publish failures while DB failures still reject", async () => {
  await verifyPublishFailure(client, "postgres");
});
