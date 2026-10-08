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
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { graphql, parse as parseGraphQL, subscribe } from "graphql";
import { createSchema } from "graphql-yoga";
import { config, setConfig } from "../../src/config/config.js";
import type { QueryResponse } from "../../src/db/connectors/dbClient.js";
import { MysqlClient } from "../../src/db/connectors/mysql/client.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import type { DatabaseDialect } from "../../src/db/dialect.js";
import { getDbClient } from "../../src/db/getDbClient.js";
import { createSqlGenerator } from "../../src/db/sqlGenerator.js";
import { CodeGen_v2 } from "../../src/generatorv2/codegen_v2.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Mutations } from "../../src/migration/makeMutaion.js";
import { Queries } from "../../src/migration/makeQuery.js";
import { createQueryResolveInfo } from "../../src/runtime/dsl/query/createQueryResolveInfo.js";
import { hydrate } from "../../src/runtime/dsl/query/sql/hydrate.js";
import type { Fields } from "../../src/runtime/field.js";

export async function verifyFirstRefetch(dialect: DatabaseDialect) {
  const postgres = dialect === "postgres";
  const database = `sasat_first_${randomUUID().replace(/-/g, "")}`;
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
  const scratch = mkdtempSync(path.join(tmpdir(), "sasat-first-")),
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
    getDbClient();
    const executor = runtime.getDbClient();
    const store = StoreMigrator.deserialize({ tables: [] }, sql);
    store.createTable("author", (t) => {
      t.column("id").int().primary().autoIncrement();
      t.column("display_name").varchar(40).fieldName("name");
      t.column("bio").text();
      t.enableGQL();
      t.addGQLQuery(Queries.primary());
      t.addGQLMutation(
        Mutations.create({ subscription: true }),
        Mutations.update({ subscription: true }),
      );
    });
    store.createTable("book", (t) => {
      t.column("id").int().primary().autoIncrement();
      t.column("title").varchar(40);
      t.references({
        columnName: "author_id",
        parentTable: "author",
        parentColumn: "id",
        relation: "Many",
        fieldName: "author",
        parentFieldName: "books",
      }).fieldName("authorId");
      t.enableGQL();
      t.addGQLQuery(Queries.primary());
      t.addGQLMutation(Mutations.create(), Mutations.update());
    });
    store.createTable("chapter", (t) => {
      t.column("id").int().primary();
      t.column("title").varchar(40);
      t.references({
        columnName: "book_id",
        parentTable: "book",
        parentColumn: "id",
        relation: "Many",
        fieldName: "book",
        parentFieldName: "chapters",
      }).fieldName("bookId");
      t.enableGQL();
      t.addGQLQuery(Queries.primary());
    });
    for (const statement of store.getSql()) await client.rawCommand(statement);
    const bulk = async (
      table: string,
      columns: string[],
      rows: (number | string)[][],
    ) => {
      for (let i = 0; i < rows.length; i += 500)
        await client.rawCommand(
          `INSERT INTO ${sql.escapeId(table)} (${columns.map((c) => sql.escapeId(c)).join(",")}) VALUES ${rows
            .slice(i, i + 500)
            .map((row) => `(${row.map((v) => sql.escape(v)).join(",")})`)
            .join(",")}`,
        );
    };
    await bulk(
      "author",
      ["id", "display_name", "bio"],
      Array.from({ length: 200 }, (_, i) => [
        i + 1,
        `author${i + 1}`,
        "x".repeat(512),
      ]),
    );
    await bulk(
      "book",
      ["id", "title", "author_id"],
      Array.from({ length: 2000 }, (_, i) => [
        i + 1,
        `book${i + 1}`,
        Math.floor(i / 10) + 1,
      ]),
    );
    await bulk(
      "chapter",
      ["id", "title", "book_id"],
      Array.from({ length: 4000 }, (_, i) => [
        i + 1,
        `chapter${i + 1}`,
        Math.floor(i / 2) + 1,
      ]),
    );
    // PostgreSQL identity sequences do not advance when explicit seed IDs are inserted.
    if (postgres)
      for (const table of ["author", "book"])
        await client.rawQuery(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`,
        );
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
      'import { createPubSub } from "sasat"; export const pubsub = createPubSub({backend:"local"});',
    );
    await new CodeGen_v2(
      new DataStoreHandler(store.serialize(), sql),
    ).generate();
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
          noUnusedLocals: true,
          noUnusedParameters: true,
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
    const { AuthorDBDataSource } = await import(
      pathToFileURL(path.join(out, "dataSources/db/Author.ts")).href
    );
    const { BookDBDataSource } = await import(
      pathToFileURL(path.join(out, "dataSources/db/Book.ts")).href
    );
    const { pubsub } = await import(
      pathToFileURL(path.join(out, "pubsub.ts")).href
    );
    const schema = createSchema(generated.schema);
    const authors = new AuthorDBDataSource();
    const books = new BookDBDataSource();
    const q = runtime.qe;
    type Sample = {
      sql: string;
      rows: number;
      dbMs: number;
      values: QueryResponse;
    };
    const samples: Sample[] = [];
    for (const actual of new Set([executor, getDbClient()])) {
      const rawQuery = actual.rawQuery.bind(actual);
      actual.rawQuery = async (query) => {
        const start = performance.now(),
          values = await rawQuery(query);
        const dbMs = performance.now() - start;
        samples.push({
          sql: query,
          rows: values.length,
          dbMs,
          values,
        });
        return values;
      };
    }
    for (const actual of new Set([executor, getDbClient()])) {
      const executeQuery = actual.executeQuery.bind(actual);
      actual.executeQuery = async (statement) => {
        const start = performance.now();
        const values = await executeQuery(statement);
        samples.push({
          sql: statement.text,
          rows: values.length,
          dbMs: performance.now() - start,
          values,
        });
        return values;
      };
    }
    const selection = () => ({
      fields: ["id", "name", "bio"],
      relations: {
        books: {
          fields: ["id", "title"],
          relations: { chapters: { fields: ["id", "title"] } },
        },
      },
    });
    const sort = [q.sort(q.field("t0", "id"), "ASC")];
    const first = await authors.first(selection(), { sort });
    assert.equal(first.id, 1);
    assert.equal(first.books.length, 10);
    assert.ok(
      first.books.every(
        (b: { chapters: unknown[] }) => b.chapters.length === 2,
      ),
    );
    assert.equal(samples.at(-1)!.rows, 20);
    assert.equal(
      (await authors.first(selection(), { sort, limit: 2 })).books.length,
      10,
    );
    assert.equal(
      (await authors.first(selection(), { sort, offset: 20 })).id,
      2,
    );
    assert.equal(
      (
        await authors.first(selection(), {
          sort: [q.sort(q.field("t0", "id"), "DESC")],
        })
      ).id,
      200,
    );
    assert.equal((await authors.first(undefined, { sort, offset: 1 })).id, 2);
    assert.equal(await authors.first(selection(), { limit: 0 }), null);
    assert.equal(
      await authors.first(selection(), {
        where: q.eq(q.field("t0", "id"), q.value(-1)),
      }),
      null,
    );
    const filtered = await authors.first(selection(), {
      where: q.and(
        q.eq(q.field("t0", "id"), q.value(2)),
        q.gt(q.field("t1", "id"), q.value(15)),
      ),
      sort,
    });
    assert.equal(filtered.id, 2);
    assert.equal(filtered.books.length, 5);
    // Selected relation aliases and explicit joins must remain available in WHERE/ORDER BY.
    assert.equal(
      (
        await authors.first(selection(), {
          sort: [q.sort(q.field("t1", "id"), "DESC")],
        })
      ).id,
      200,
    );
    assert.equal(
      (
        await authors.first(selection(), {
          sort: [q.sort(q.ident("t0__name"), "ASC")],
        })
      ).id,
      1,
    );
    const explicit = q.join(
      q.table("book", [], "matching"),
      q.eq(q.field("t0", "id"), q.field("matching", "author_id")),
      "INNER",
    );
    assert.equal(
      (
        await authors.first(selection(), {
          join: [explicit],
          where: q.eq(q.field("matching", "id"), q.value(31)),
        })
      ).id,
      4,
    );
    for (const lock of ["FOR UPDATE", "FOR SHARE"] as const) {
      const tx = await client.transaction();
      try {
        const locked = await new AuthorDBDataSource(tx).first(selection(), {
          where: q.eq(q.field("t0", "id"), q.value(1)),
          lock,
        });
        assert.equal(locked.books.length, 10);
      } finally {
        await tx.rollback();
      }
    }
    await verifyCompositeFirst(runtime, executor);
    const call = async (
      source: string,
      variableValues?: Record<string, unknown>,
      target = schema,
    ) => {
      const result = await graphql({ schema: target, source, variableValues });
      assert.equal(result.errors, undefined, JSON.stringify(result.errors));
      return JSON.parse(JSON.stringify(result.data));
    };
    samples.length = 0;
    const selected = await call(
      `mutation { updateBook(book:{id:1,title:"selected"}) { title chapters { id } } }`,
    );
    assert.equal(selected.updateBook.chapters.length, 2);
    assert.equal(samples.length, 1);
    assert.ok(!samples[0].sql.includes("author_id"));
    assert.ok(!samples[0].sql.includes("t1__title"));
    samples.length = 0;
    const fragments = await call(
      `mutation($include:Boolean!) { updateAuthor(author:{id:1,name:"selected"}) { alias:name ...A ... on Author { books { ...B } } } } fragment A on Author { books { id chapters @include(if:$include) { title } } } fragment B on Book { title }`,
      { include: true },
    );
    assert.equal(fragments.updateAuthor.books.length, 10);
    assert.ok(
      fragments.updateAuthor.books.every(
        (b: { chapters: unknown[] }) => b.chapters.length === 2,
      ),
    );
    assert.equal(samples.length, 1);
    samples.length = 0;
    await call(
      `mutation($skip:Boolean!) { updateBook(book:{id:1,title:"skip"}) { id chapters @skip(if:$skip) { id } } }`,
      { skip: true },
    );
    assert.equal(samples.length, 1);
    assert.ok(!samples[0].sql.includes("JOIN"));
    const createdBook = await call(
      'mutation { createBook(book:{title:"created",authorId:1}) { id author { name } } }',
    );
    assert.equal(createdBook.createBook.author.name, "selected");
    await books.delete({ id: createdBook.createBook.id });
    const noRelations = await call(
      'mutation { createAuthor(author:{name:"empty",bio:"empty"}) { id books { id } } }',
    );
    assert.deepEqual(noRelations.createAuthor.books, []);
    await authors.delete({ id: noRelations.createAuthor.id });
    assert.deepEqual(
      await call(
        'mutation { updateBook(book:{id:1,title:"typename"}) { __typename } }',
      ),
      { updateBook: { __typename: "Book" } },
    );
    // A subscriber can request columns/relations absent from the mutation response.
    const stream = await subscribe({
      schema,
      document: parseGraphQL(
        "subscription { AuthorUpdated { bio books { id title chapters { id } } } }",
      ),
    });
    assert.ok(Symbol.asyncIterator in stream);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const captured: Record<string, unknown>[] = [];
    const publish = pubsub.publish.bind(pubsub);
    pubsub.publish = async (name: string, payload: Record<string, unknown>) => {
      captured.push(payload);
      await publish(name, payload);
    };
    try {
      const next = stream.next();
      await new Promise((resolve) => setImmediate(resolve));
      await call(
        'mutation { updateAuthor(author:{id:1,name:"event"}) { books { id } } }',
      );
      const event = await Promise.race([
        next,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("subscription timeout")),
            5000,
          );
        }),
      ]);
      assert.ok(!event.done);
      assert.equal(
        event.value.errors,
        undefined,
        JSON.stringify(event.value.errors),
      );
      const value = event.value.data!.AuthorUpdated as {
        bio: string;
        books: { chapters: unknown[] }[];
      };
      assert.equal(value.bio, "x".repeat(512));
      assert.equal(value.books[0].chapters.length, 2);
      assert.equal(
        Object.hasOwn(captured[0].AuthorUpdated as object, "books"),
        false,
      );
    } finally {
      clearTimeout(timer);
      await stream.return?.();
      pubsub.publish = publish;
    }
    // Match the former mutation path: write, refetch scalar columns, resolve relations separately.
    const baselineSchema = createSchema({
      ...generated.schema,
      resolvers: {
        ...generated.schema.resolvers,
        Mutation: {
          ...generated.schema.resolvers.Mutation,
          updateAuthor: async (
            _: unknown,
            { author }: { author: { id: number; name: string } },
          ) => {
            await authors.update(author);
            return authors.findById(author.id);
          },
        },
      },
    });
    const mutation =
      'mutation { updateAuthor(author:{id:1,name:"benchmark"}) { name books { id title chapters { id title } } } }';
    const measure = async (
      label: string,
      fn: () => Promise<unknown>,
      hydrationFields?: ReturnType<typeof selection>,
    ) => {
      const runs: {
        queries: number;
        rows: number;
        bytes: number;
        dbMs: number;
        wallMs: number;
        hydrateMs?: number;
      }[] = [];
      for (let i = 0; i < 8; i++) {
        samples.length = 0;
        const start = performance.now();
        await fn();
        const wallMs = performance.now() - start;
        let hydrateMs: number | undefined;
        if (hydrationFields) {
          const info = createQueryResolveInfo(
            authors.tableName,
            hydrationFields as unknown as Fields<unknown>,
            authors.relationMap,
            authors.tableInfo,
          );
          const begin = performance.now();
          hydrate(samples[0].values, info);
          hydrateMs = performance.now() - begin;
        }
        if (i)
          runs.push({
            queries: samples.length,
            rows: samples.reduce((n, s) => n + s.rows, 0),
            bytes: samples.reduce(
              (n, s) => n + Buffer.byteLength(JSON.stringify(s.values)),
              0,
            ),
            dbMs: samples.reduce((n, s) => n + s.dbMs, 0),
            wallMs,
            hydrateMs,
          });
      }
      const median = (key: keyof (typeof runs)[number]) => {
        const values = runs
          .map((r) => r[key])
          .filter((v) => v !== undefined)
          .sort((a, b) => a - b);
        return values.length
          ? Number(values[Math.floor(values.length / 2)].toFixed(3))
          : undefined;
      };
      console.log(
        "S08_METRIC " +
          JSON.stringify({
            dialect,
            label,
            queries: median("queries"),
            rows: median("rows"),
            jsonBytes: median("bytes"),
            dbRoundTripMs: median("dbMs"),
            wallMs: median("wallMs"),
            hydrateReplayMs: median("hydrateMs"),
          }),
      );
    };
    const oldFields = selection();
    await authors.find(oldFields, { sort });
    const newFields = selection();
    await authors.first(newFields, { sort });
    await measure(
      "first-before-find",
      async () => {
        return (await authors.find(oldFields, { sort }))[0];
      },
      oldFields,
    );
    await measure(
      "first-after",
      () => authors.first(newFields, { sort }),
      newFields,
    );
    await measure("mutation-before-modeled", () =>
      call(mutation, undefined, baselineSchema),
    );
    await measure("mutation-after", () => call(mutation));
    await pubsub.close();
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

async function verifyCompositeFirst(
  runtime: typeof import("../../src/index.js"),
  client: import("../../src/db/connectors/dbClient.js").SQLExecutor,
) {
  const q = runtime.qe;
  type Pair = { tenant: number; id: number };
  type PairResult = Pair & { children?: { seq: number }[] };
  class Pairs extends runtime.SasatDBDatasource<
    Pair,
    Pair,
    Pair,
    Pair,
    Fields<Pair>,
    PairResult
  > {
    tableName = "pair";
    fields = ["tenant", "id"];
    primaryKeys = ["tenant_id", "id"];
    identifyFields = ["tenant", "id"];
    autoIncrementColumn = undefined;
    tableInfo = {
      pair: {
        identifiableKeys: ["tenant_id", "id"],
        identifiableFields: ["tenant", "id"],
        columnMap: { tenant: "tenant_id", id: "id" },
      },
      pair_child: {
        identifiableKeys: ["tenant_id", "parent_id", "seq"],
        identifiableFields: ["tenant", "parentId", "seq"],
        columnMap: { tenant: "tenant_id", parentId: "parent_id", seq: "seq" },
      },
    };
    relationMap: import("../../src/runtime/dsl/query/createQueryResolveInfo.js").RelationMap =
      {
        pair: {
          children: {
            table: "pair_child",
            array: true,
            nullable: false,
            requiredColumns: ["tenant_id", "id"],
            condition: ({ parentTableAlias, childTableAlias, context }) =>
              q.and(
                q.eq(
                  q.field(parentTableAlias!, "tenant_id"),
                  q.field(childTableAlias, "tenant_id"),
                ),
                q.eq(
                  q.field(parentTableAlias!, "id"),
                  q.field(childTableAlias, "parent_id"),
                ),
                q.gte(
                  q.field(childTableAlias, "seq"),
                  q.value(
                    (context as { minimum?: number } | undefined)?.minimum ?? 0,
                  ),
                ),
              ),
          },
        },
        pair_child: {},
      };
    getDefaultValueString() {
      return {};
    }
  }
  await client.rawCommand(
    "CREATE TABLE pair (tenant_id INT NOT NULL, id INT NOT NULL, PRIMARY KEY (tenant_id,id))",
  );
  await client.rawCommand(
    "CREATE TABLE pair_child (tenant_id INT NOT NULL, parent_id INT NOT NULL, seq INT NOT NULL, PRIMARY KEY (tenant_id,parent_id,seq))",
  );
  await client.rawCommand("INSERT INTO pair VALUES (1,1),(1,2),(2,1),(2,2)");
  await client.rawCommand(
    "INSERT INTO pair_child VALUES (1,1,1),(1,1,2),(1,2,1),(1,2,2),(2,1,1),(2,1,2),(2,2,1),(2,2,2)",
  );
  const pairs = new Pairs(client);
  const fields = (): Fields<Pair> => ({
    fields: ["tenant", "id"],
    tableAlias: "sasat_first",
    relations: { children: { fields: ["seq"] } },
  });
  const options = {
    sort: [
      q.sort(q.field("sasat_first", "tenant_id"), "DESC"),
      q.sort(q.field("sasat_first", "id"), "DESC"),
    ],
  };
  const first = await pairs.first(fields(), options);
  assert.equal(first?.tenant, 2);
  assert.equal(first?.id, 2);
  assert.equal(first?.children?.length, 2);
  const filtered = await pairs.first(fields(), options, { minimum: 2 });
  assert.equal(filtered?.children?.length, 1);
  assert.equal(filtered?.children?.[0].seq, 2);
}
