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
import { config, setConfig } from "../../src/config/config.js";
import { MysqlClient } from "../../src/db/connectors/mysql/client.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import type { DatabaseDialect } from "../../src/db/dialect.js";
import { getDbClient } from "../../src/db/getDbClient.js";
import { readPostgresSchema } from "../../src/db/sql/postgresSchema.js";
import { createSqlGenerator } from "../../src/db/sqlGenerator.js";
import { CodeGen_v2 } from "../../src/generatorv2/codegen_v2.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Mutations } from "../../src/migration/makeMutaion.js";
import { Queries } from "../../src/migration/makeQuery.js";
import { createPubSub } from "../../src/runtime/createPubSub.js";
import { QExpr } from "../../src/runtime/dsl/factory.js";

export async function verifyNumericDatabase(dialect: DatabaseDialect) {
  const postgres = dialect === "postgres";
  const database = `sasat_numeric_${randomUUID().replace(/-/g, "")}`;
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
  const scratch = mkdtempSync(path.join(tmpdir(), "sasat-numeric-"));
  const out = path.join(scratch, "out");
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
    const store = StoreMigrator.deserialize({ tables: [] }, sql);
    store.createTable("numeric_record", (t) => {
      t.column("id").bigInt().signed().primary();
      t.column("amount").decimal(38, 18);
      t.column("optional").bigInt().signed().nullable();
      t.column("defaultQuantity").bigInt().signed().default(9007199254740993n);
      t.column("defaultPrice").decimal(38, 18).default("0.123456789012345678");
      t.enableGQL();
      t.addGQLQuery(Queries.primary());
      t.addGQLMutation(
        Mutations.create({
          noRefetch: true,
          subscription: { enabled: true, subscriptionFilter: ["id"] },
        }),
        Mutations.update(),
        Mutations.delete(),
      );
    });
    store.createTable("numeric_auto", (t) => {
      t.column("id").bigInt().primary().autoIncrement();
      t.column("amount").decimal(38, 18);
      t.enableGQL();
      t.addGQLQuery(Queries.primary());
      t.addGQLMutation(Mutations.create({ noRefetch: true }));
    });
    store.createTable("numeric_hash", (t) => {
      t.autoIncrementHashId("id", { bigint: true });
      t.column("amount").decimal(38, 18);
      t.enableGQL();
      t.addGQLQuery(Queries.primary());
      t.addGQLMutation(Mutations.create({ noRefetch: true }));
    });
    if (!postgres)
      store.createTable("numeric_unsigned", (t) => {
        t.column("id").bigInt().unsigned().primary().autoIncrement();
        t.column("amount").decimal(38, 18);
        t.enableGQL();
        t.addGQLQuery(Queries.primary());
        t.addGQLMutation(Mutations.create({ noRefetch: true }));
      });
    for (const query of store.getSql()) await client.rawCommand(query);
    mkdirSync(out);
    writeFileSync(
      path.join(out, "pubsub.ts"),
      'import { createPubSub } from "sasat";\nexport const pubsub = createPubSub({backend: "local"});\n',
    );
    writeFileSync(
      path.join(scratch, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    mkdirSync(path.join(scratch, "node_modules"));
    symlinkSync(process.cwd(), path.join(scratch, "node_modules/sasat"));
    for (const name of readdirSync(path.resolve("node_modules"))) {
      if (name !== "sasat" && name !== ".bin")
        symlinkSync(
          path.resolve("node_modules", name),
          path.join(scratch, "node_modules", name),
        );
    }
    // Existing generated encoders must migrate too, while preserving the salt.
    writeFileSync(
      path.join(out, "idEncoder.ts"),
      'import HashIds from "hashids";\nimport { makeNumberIdEncoder } from "sasat";\nexport const NumericHashHashId = makeNumberIdEncoder(new HashIds("kept-salt"));\n',
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
    const call = async (
      source: string,
      variableValues?: Record<string, unknown>,
    ) => {
      const result = await graphql({ schema, source, variableValues });
      assert.equal(result.errors, undefined, JSON.stringify(result.errors));
      return JSON.parse(JSON.stringify(result.data));
    };
    const amount = "12345678901234567890.123456789012345678";
    const values = [
      0n,
      2147483647n,
      2147483648n,
      -2147483649n,
      9007199254740991n,
      9007199254740992n,
      9007199254740993n,
      -9223372036854775808n,
      9223372036854775807n,
    ];
    for (const id of values) {
      const result = await call(
        "mutation($row: NumericRecordCreateInput!) { createNumericRecord(numericRecord: $row) { id amount optional defaultQuantity defaultPrice } }",
        { row: { id: String(id), amount, optional: null } },
      );
      assert.deepEqual(result.createNumericRecord, {
        id: String(id),
        amount,
        optional: null,
        defaultQuantity: "9007199254740993",
        defaultPrice: "0.123456789012345678",
      });
      const fetched = await call(
        "query($id: BigInt!) { numericRecord(id: $id) { id amount defaultQuantity defaultPrice } }",
        { id: String(id) },
      );
      assert.deepEqual(fetched.numericRecord, {
        id: String(id),
        amount,
        defaultQuantity: "9007199254740993",
        defaultPrice: "0.123456789012345678",
      });
    }
    const stream = await subscribe({
      schema,
      document: parseGraphQL(
        "subscription($id: BigInt!) { NumericRecordCreated(id: $id) { id amount } }",
      ),
      variableValues: { id: "-9007199254740993" },
    });
    assert.ok(Symbol.asyncIterator in stream);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const next = stream.next();
      await new Promise((resolve) => setImmediate(resolve));
      await call(
        'mutation { createNumericRecord(numericRecord: { id: "-9007199254740993", amount: "0.123456789012345678" }) { id } }',
      );
      const event = await Promise.race([
        next,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Numeric subscription timed out")),
            5000,
          );
        }),
      ]);
      assert.ok(!event.done);
      assert.equal(event.value.errors, undefined);
      assert.deepEqual(JSON.parse(JSON.stringify(event.value.data)), {
        NumericRecordCreated: {
          id: "-9007199254740993",
          amount: "0.123456789012345678",
        },
      });
    } finally {
      clearTimeout(timer);
      await stream.return?.();
    }
    const raw = await client.rawQuery(
      `SELECT * FROM ${sql.escapeId("numeric_record")} WHERE id = 9007199254740993`,
    );
    assert.equal(raw[0].id, 9007199254740993n);
    assert.equal(raw[0].amount, amount);
    const bad = await graphql({
      schema,
      source: "query($id: BigInt!) { numericRecord(id: $id) { id } }",
      variableValues: { id: 9007199254740992 },
    });
    assert.ok(bad.errors?.length);
    await call(
      'mutation { updateNumericRecord(numericRecord: {id: "9007199254740993", amount: "-0.000000000000000001", optional: "9223372036854775807"}) { id amount optional } }',
    );
    const updated = await call(
      "{ numericRecord(id: 9007199254740993) { amount optional } }",
    );
    assert.deepEqual(updated.numericRecord, {
      amount: "-0.000000000000000001",
      optional: "9223372036854775807",
    });
    await call(
      'mutation { updateNumericRecord(numericRecord: {id: "9007199254740993", optional: null}) { optional } }',
    );
    assert.equal(
      (
        await client.rawQuery(
          "SELECT optional FROM numeric_record WHERE id = 9007199254740993",
        )
      )[0].optional,
      null,
    );
    const auto = await call(
      'mutation { createNumericAuto(numericAuto: { amount: "1.25" }) { id amount } }',
    );
    assert.deepEqual(auto.createNumericAuto, { id: "1", amount: "1.25" });
    for (const table of ["numeric_auto", "numeric_hash"]) {
      await client.rawCommand(
        postgres
          ? `ALTER TABLE ${table} ALTER COLUMN id RESTART WITH 9007199254740993`
          : `ALTER TABLE ${table} AUTO_INCREMENT = 9007199254740993`,
      );
    }
    assert.equal(
      (
        await call(
          'mutation { createNumericAuto(numericAuto: { amount: "1.25" }) { id } }',
        )
      ).createNumericAuto.id,
      "9007199254740993",
    );
    const hash = (
      await call(
        'mutation { createNumericHash(numericHash: { amount: "1.25" }) { id } }',
      )
    ).createNumericHash.id;
    assert.equal(typeof hash, "string");
    assert.equal(
      (
        await call("query($id: ID!) { numericHash(id: $id) { id } }", {
          id: hash,
        })
      ).numericHash.id,
      hash,
    );
    const { NumericAutoDBDataSource } = await import(
      pathToFileURL(path.join(out, "dataSources/db/NumericAuto.ts")).href
    );
    const tx = await runtime.getDbClient().transaction();
    try {
      const ds = new NumericAutoDBDataSource(tx);
      const row = await ds.create({ amount: "2.000000000000000001" });
      assert.equal(typeof row.id, "bigint");
      const found = await ds.find(undefined, {
        where: QExpr.in(QExpr.field("t0", "id"), [row.id]),
      });
      assert.equal(found[0].id, row.id);
      assert.equal(found[0].amount, "2.000000000000000001");
    } finally {
      await tx.rollback();
    }
    if (postgres) {
      const imported = await readPostgresSchema(client);
      const columns = imported.tables.find(
        (t) => t.tableName === "numeric_record",
      )!.columns;
      assert.equal(
        columns.find((c) => c.columnName === "defaultQuantity")!.default,
        "9007199254740993",
      );
      assert.equal(
        columns.find((c) => c.columnName === "defaultPrice")!.default,
        "0.123456789012345678",
      );
    } else {
      await client.rawCommand(
        "ALTER TABLE numeric_unsigned AUTO_INCREMENT = 18446744073709551614",
      );
      const unsigned = await call(
        'mutation { createNumericUnsigned(numericUnsigned: {amount: "1.25"}) { id } }',
      );
      assert.equal(unsigned.createNumericUnsigned.id, "18446744073709551614");
      await client.rawCommand(
        "INSERT INTO numeric_unsigned VALUES (18446744073709551615, 1.25)",
      );
      assert.equal(
        (
          await client.rawQuery(
            "SELECT id FROM numeric_unsigned ORDER BY id DESC",
          )
        )[0].id,
        18446744073709551615n,
      );
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

export async function verifyNumericRedis() {
  const options = {
    backend: "redis" as const,
    redisUrl: process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379",
    channelPrefix: `numeric:${randomUUID()}:`,
  };
  const publisher = createPubSub(options),
    subscriber = createPubSub(options);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const payload = {
      id: 9007199254740993n,
      amount: "0.123456789012345678",
      children: [{ id: 1n }, { id: -9223372036854775808n }],
    };
    let resolve!: (value: unknown) => void;
    const received = new Promise((res, reject) => {
      resolve = res;
      timer = setTimeout(
        () => reject(new Error("Redis numeric delivery timed out")),
        5000,
      );
    });
    await subscriber.subscribe("saved", resolve);
    await publisher.publish("saved", payload);
    assert.deepEqual(await received, payload);
  } finally {
    clearTimeout(timer);
    await Promise.all([publisher.close(), subscriber.close()]);
  }
}
