import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { graphql, parse as parseGraphQL, subscribe } from "graphql";
import { createSchema } from "graphql-yoga";
import Hashids from "hashids";
import { config, setConfig } from "../../src/config/config.js";
import { MysqlClient } from "../../src/db/connectors/mysql/client.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import type { DatabaseDialect } from "../../src/db/dialect.js";
import { getDbClient } from "../../src/db/getDbClient.js";
import { createSqlGenerator } from "../../src/db/sqlGenerator.js";
import { CodeGen_v2 } from "../../src/generatorv2/codegen_v2.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Conditions } from "../../src/migration/makeCondition.js";
import { Mutations } from "../../src/migration/makeMutaion.js";
import { Queries } from "../../src/migration/makeQuery.js";

export async function verifyHashIds(dialect: DatabaseDialect) {
  const postgres = dialect === "postgres";
  const database = `sasat_hash_${randomUUID().replace(/-/g, "")}`;
  const settings = postgres
    ? {
        host: process.env.TEST_PG_HOST ?? "127.0.0.1",
        port: Number(process.env.TEST_PG_PORT ?? 5432),
        user: process.env.TEST_PG_USER ?? "postgres",
        password: process.env.TEST_PG_PASSWORD ?? "",
      }
    : {
        host: process.env.TEST_DB_HOST ?? "127.0.0.1",
        port: Number(process.env.TEST_DB_PORT ?? 3308),
        user: process.env.TEST_DB_USER ?? "root",
        password: process.env.TEST_DB_PASSWORD ?? "",
      };
  const admin = postgres
    ? new PostgresClient({ ...settings, database: "postgres" })
    : new MysqlClient(settings);
  const client = postgres
    ? new PostgresClient({ ...settings, database })
    : new MysqlClient({ ...settings, database });
  const sql = createSqlGenerator(dialect);
  const scratch = mkdtempSync(path.join(tmpdir(), "sasat-hash-")),
    out = path.join(scratch, "out");
  const original = structuredClone(config());
  const runtime = (await import(
    pathToFileURL(path.resolve("dist/index.mjs")).href
  )) as typeof import("../../src/index.js");
  let created = false;
  try {
    await admin.rawCommand(`CREATE DATABASE ${sql.escapeId(database)}`);
    created = true;
    setConfig({
      db: { ...settings, database, dialect },
      migration: { out },
      generator: { addJsExtToImportStatement: true },
    });
    runtime.setConfig({ db: { ...settings, database, dialect } });
    const statements: string[] = [],
      logger = (query: string) => statements.push(query);
    getDbClient(undefined, logger);
    runtime.getDbClient(undefined, logger);
    const store = StoreMigrator.deserialize({ tables: [] }, sql);
    for (const kind of ["number", "bigint"]) {
      const suffix = kind === "number" ? "Number" : "Bigint";
      store.createTable(`hash_owner_${kind}`, (t) => {
        t.autoIncrementHashId("owner_pk", {
          bigint: kind === "bigint",
          salt: `owner-${kind}`,
        });
        t.column("name").varchar(30);
        t.enableGQL();
        t.addGQLQuery(Queries.primary());
      });
      store.createTable(`hash_document_${kind}`, (t) => {
        t.autoIncrementHashId("doc_pk", {
          bigint: kind === "bigint",
          salt: `doc-${kind}`,
        });
        t.column("title").varchar(30);
        t.references({
          columnName: "owner_id",
          parentTable: `hash_owner_${kind}`,
          parentColumn: "owner_pk",
          relation: "Many",
          fieldName: "owner",
          parentFieldName: "documents",
        })
          .fieldName("ownerId")
          .nullable()
          .updatable(true);
        t.references({
          columnName: "tenant_id",
          parentTable: `hash_owner_${kind}`,
          parentColumn: "owner_pk",
          relation: "Many",
          fieldName: "tenant",
          parentFieldName: "tenantDocuments",
        })
          .fieldName("tenantId")
          .updatable(true);
        t.enableGQL();
        t.addGQLQuery(
          Queries.primary(),
          Queries.listAll(`documentsLegacyOwner${suffix}`, {
            conditions: [
              Conditions.query.comparison(
                Conditions.value.field("owner_id"),
                "=",
                Conditions.value.arg("owner", "String"),
              ),
            ],
          }),
          Queries.listAll(`documentsByOwner${suffix}`, {
            conditions: [
              Conditions.query.comparison(
                Conditions.value.field("owner_id"),
                "=",
                Conditions.value.arg("owner", "ID"),
              ),
            ],
          }),
          Queries.listAll(`documentsBetweenOwners${suffix}`, {
            conditions: [
              Conditions.query.between(
                Conditions.value.field("owner_id"),
                Conditions.value.arg("begin", "ID"),
                Conditions.value.arg("end", "ID"),
              ),
            ],
          }),
        );
        const contextFields = [
          { column: "tenant_id", contextName: `tenant${suffix}` },
        ];
        t.addGQLMutation(
          Mutations.create({
            contextFields,
            subscription: { enabled: true, subscriptionFilter: ["owner_id"] },
          }),
          Mutations.update({
            contextFields,
            subscription: { enabled: true, subscriptionFilter: ["doc_pk"] },
          }),
          Mutations.delete(),
        );
      });
      store.createTable(`hash_link_${kind}`, (t) => {
        t.references({
          columnName: "owner_id",
          parentTable: `hash_owner_${kind}`,
          parentColumn: "owner_pk",
          relation: "Many",
          fieldName: "owner",
          parentFieldName: "links",
        })
          .fieldName("ownerId")
          .primary();
        t.column("label").varchar(20);
        t.enableGQL();
        t.addGQLQuery(Queries.primary());
      });
    }
    for (const query of store.getSql()) await client.rawCommand(query);
    const seed = await client.transaction();
    try {
      if (!postgres)
        await seed.rawCommand(
          "SET SESSION sql_mode = CONCAT(@@sql_mode, ',NO_AUTO_VALUE_ON_ZERO')",
        );
      for (const kind of ["number", "bigint"]) {
        await seed.rawCommand(
          `INSERT INTO hash_owner_${kind} (owner_pk, name) VALUES (0, 'zero'), (42, 'other')`,
        );
        await seed.rawCommand(
          `INSERT INTO hash_document_${kind} (doc_pk, title, owner_id, tenant_id) VALUES (0, 'initial', 0, 0)`,
        );
        await seed.rawCommand(
          `INSERT INTO hash_link_${kind} (owner_id, label) VALUES (0, 'link')`,
        );
      }
      await seed.commit();
    } catch (error) {
      await seed.rollback();
      throw error;
    }
    mkdirSync(out);
    writeFileSync(
      path.join(scratch, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    mkdirSync(path.join(scratch, "node_modules"));
    symlinkSync(process.cwd(), path.join(scratch, "node_modules/sasat"));
    for (const name of readdirSync(path.resolve("node_modules")))
      if (name !== "sasat" && name !== ".bin")
        symlinkSync(
          path.resolve("node_modules", name),
          path.join(scratch, "node_modules", name),
        );
    writeFileSync(
      path.join(out, "pubsub.ts"),
      'import { createPubSub } from "sasat";\nexport const pubsub = createPubSub({backend: "local"});\n',
    );
    const data = new DataStoreHandler(store.serialize(), sql);
    for (const kind of ["number", "bigint"]) {
      data.table(`hash_owner_${kind}`).column("owner_pk").data.fieldName =
        "ownerId";
      data.table(`hash_document_${kind}`).column("doc_pk").data.fieldName =
        "docId";
    }
    await new CodeGen_v2(data).generate();
    writeFileSync(
      path.join(out, "input-types.ts"),
      `import { mutation } from './__generated__/mutation.js';
import { query } from './__generated__/query.js';
type NumberUpdate = Parameters<typeof mutation.updateHashDocumentNumber>[1];
type BigUpdate = Parameters<typeof mutation.updateHashDocumentBigint>[1];
const nullable: NumberUpdate = { hashDocumentNumber: { docId: 'hash', ownerId: null } };
const omitted: NumberUpdate = { hashDocumentNumber: { docId: 'hash' } };
const large: BigUpdate = { hashDocumentBigint: { docId: 'hash', ownerId: 'hash' } };
const create: Parameters<typeof mutation.createHashDocumentBigint>[1] = { hashDocumentBigint: { title: 'title' } };
const primary: Parameters<typeof query.hashLinkBigint>[1] = { ownerId: 'hash' };
// @ts-expect-error Hash IDs are strings on incoming resolvers.
const raw: NumberUpdate = { hashDocumentNumber: { docId: 1 } };
// @ts-expect-error Context-owned fields are absent from GraphQL input.
const tenant: BigUpdate = { hashDocumentBigint: { docId: 'hash', tenantId: 'hash' } };
// @ts-expect-error A primary ID is required for updates.
const missing: NumberUpdate = { hashDocumentNumber: { title: 'bad' } };
`,
    );
    writeFileSync(
      path.join(scratch, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2020",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["out/**/*.ts"],
      }),
    );
    execFileSync(
      process.execPath,
      [
        path.resolve("node_modules/typescript/bin/tsc"),
        "-p",
        path.join(scratch, "tsconfig.json"),
      ],
      { stdio: "inherit" },
    );
    const generated = await import(
      pathToFileURL(path.join(out, "schema.ts")).href
    );
    const schema = createSchema(generated.schema);
    const contextValue = { tenantNumber: 0, tenantBigint: 0n };
    const call = async (
      source: string,
      variableValues?: Record<string, unknown>,
    ) => {
      const result = await graphql({
        schema,
        source,
        variableValues,
        contextValue,
      });
      assert.equal(result.errors, undefined, JSON.stringify(result.errors));
      return JSON.parse(JSON.stringify(result.data));
    };
    for (const kind of ["number", "bigint"]) {
      const suffix = kind === "number" ? "Number" : "Bigint",
        entity = `HashDocument${suffix}`,
        field = `hashDocument${suffix}`;
      const owner = new Hashids(`owner-${kind}`),
        document = new Hashids(`doc-${kind}`);
      const zero = document.encode(0),
        ownerZero = owner.encode(0),
        owner42 = owner.encode(42);
      const result = await call(
        `query($id: ID!) { ${field}(docId: $id) { docId ownerId tenantId owner { ownerId } } }`,
        { id: zero },
      );
      assert.deepEqual(result[field], {
        docId: zero,
        ownerId: ownerZero,
        tenantId: ownerZero,
        owner: { ownerId: ownerZero },
      });
      assert.equal(
        (
          await call(
            `query($id: ID!) { hashLink${suffix}(ownerId: $id) { ownerId label } }`,
            { id: ownerZero },
          )
        )[`hashLink${suffix}`].ownerId,
        ownerZero,
      );
      assert.equal(
        (
          await call(
            `query($owner: ID!) { documentsByOwner${suffix}(owner: $owner) { docId } }`,
            { owner: ownerZero },
          )
        )[`documentsByOwner${suffix}`].length,
        1,
      );
      assert.equal(
        (
          await call(
            `query($begin: ID!, $end: ID!) { documentsBetweenOwners${suffix}(begin: $begin, end: $end) { docId } }`,
            { begin: ownerZero, end: owner42 },
          )
        )[`documentsBetweenOwners${suffix}`].length,
        1,
      );
      assert.equal(
        (
          await call(
            `query($owner: String!) { documentsLegacyOwner${suffix}(owner: $owner) { docId } }`,
            { owner: ownerZero },
          )
        )[`documentsLegacyOwner${suffix}`].length,
        1,
      );
      const update = (input: Record<string, unknown>) =>
        call(
          `mutation($input: ${entity}UpdateInput!) { update${entity}(${field}: $input) { docId title ownerId tenantId owner { ownerId } } }`,
          { input: { docId: zero, ...input } },
        );
      assert.equal(
        (await update({ ownerId: owner42 }))[`update${entity}`].ownerId,
        owner42,
      );
      assert.equal(
        (await update({ title: "omitted" }))[`update${entity}`].ownerId,
        owner42,
      );
      assert.equal(
        (await update({ title: "undefined", ownerId: undefined }))[
          `update${entity}`
        ].ownerId,
        owner42,
      );
      const cleared = (await update({ ownerId: null }))[`update${entity}`];
      assert.equal(cleared.ownerId, null);
      assert.equal(cleared.owner, null);
      assert.equal(
        (
          await client.rawQuery(
            `SELECT owner_id FROM hash_document_${kind} WHERE doc_pk=0`,
          )
        )[0].owner_id,
        null,
      );
      assert.equal(
        (await update({ ownerId: ownerZero }))[`update${entity}`].ownerId,
        ownerZero,
      );
      for (const input of [
        { title: "create omitted" },
        { title: "create null", ownerId: null },
      ]) {
        const value = (
          await call(
            `mutation($input: ${entity}CreateInput!) { create${entity}(${field}: $input) { ownerId tenantId } }`,
            { input },
          )
        )[`create${entity}`];
        assert.deepEqual(value, { ownerId: null, tenantId: ownerZero });
      }
      // Both malformed IDs and multi-number Hashids must fail without SQL.
      for (const bad of [
        "",
        "!",
        document.encode(1, 2),
        new Hashids("wrong-salt").encode(42),
      ]) {
        for (const [source, variableValues] of [
          [`query($id: ID!) { ${field}(docId: $id) { docId } }`, { id: bad }],
          [
            `mutation($input: ${entity}UpdateInput!) { update${entity}(${field}: $input) { docId } }`,
            { input: { docId: bad, title: "bad" } },
          ],
          [
            `mutation($input: ${entity}UpdateInput!) { update${entity}(${field}: $input) { docId } }`,
            { input: { docId: zero, ownerId: bad } },
          ],
          [
            `mutation($input: ${entity}CreateInput!) { create${entity}(${field}: $input) { docId } }`,
            { input: { title: "bad", ownerId: bad } },
          ],
          [
            `mutation($input: ${entity}IdentifyInput!) { delete${entity}(${field}: $input) }`,
            { input: { docId: bad } },
          ],
          [
            `query($id: ID!) { hashLink${suffix}(ownerId: $id) { ownerId } }`,
            { id: bad },
          ],
          [
            `query($id: ID!) { documentsByOwner${suffix}(owner: $id) { docId } }`,
            { id: bad },
          ],
          [
            `query($id: ID!) { documentsBetweenOwners${suffix}(begin: $id, end: $id) { docId } }`,
            { id: bad },
          ],
        ] as const) {
          statements.length = 0;
          const invalid = await graphql({
            schema,
            source,
            variableValues,
            contextValue,
          });
          assert.equal(
            invalid.errors?.[0].extensions.code,
            "BAD_USER_INPUT",
            JSON.stringify(invalid.errors),
          );
          assert.equal(invalid.errors?.[0].message, "Invalid Hash ID");
          assert.equal(statements.length, 0, "invalid ID must not execute SQL");
        }
        for (const [event, argument] of [
          [`${entity}Created`, "owner_id"],
          [`${entity}Updated`, "doc_pk"],
        ]) {
          const invalid = await subscribe({
            schema,
            document: parseGraphQL(
              `subscription($id: ID!) { ${event}(${argument}: $id) { docId } }`,
            ),
            variableValues: { id: bad },
          });
          assert.ok(!(Symbol.asyncIterator in invalid));
          assert.equal(invalid.errors?.[0].extensions.code, "BAD_USER_INPUT");
        }
      }
      const absent = document.encode(9999);
      assert.equal(
        (
          await call(`query($id: ID!) { ${field}(docId: $id) { docId } }`, {
            id: absent,
          })
        )[field],
        null,
      );
      assert.equal(
        (
          await call(
            `mutation($input: ${entity}IdentifyInput!) { delete${entity}(${field}: $input) }`,
            { input: { docId: absent } },
          )
        )[`delete${entity}`],
        false,
      );
      // Verify the generated subscription's zero-valued filter and output resolver.
      const stream = await subscribe({
        schema,
        document: parseGraphQL(
          `subscription($id: ID!) { ${entity}Updated(doc_pk: $id) { docId ownerId } }`,
        ),
        variableValues: { id: zero },
      });
      assert.ok(Symbol.asyncIterator in stream);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const next = stream.next();
        await new Promise((resolve) => setImmediate(resolve));
        await update({ title: "event", ownerId: null });
        const event = await Promise.race([
          next,
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error("Hash ID subscription timed out")),
              5000,
            );
          }),
        ]);
        assert.ok(!event.done);
        assert.equal(event.value.errors, undefined);
        assert.deepEqual(JSON.parse(JSON.stringify(event.value.data)), {
          [`${entity}Updated`]: { docId: zero, ownerId: null },
        });
      } finally {
        clearTimeout(timer);
        await stream.return?.();
      }
    }
  } finally {
    await runtime.getDbClient().release();
    await getDbClient().release();
    await client.release();
    if (created)
      await admin.rawCommand(`DROP DATABASE ${sql.escapeId(database)}`);
    await admin.release();
    Object.assign(config(), original);
    rmSync(scratch, { recursive: true, force: true });
  }
}
