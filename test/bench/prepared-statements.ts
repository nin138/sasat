/** Opt-in benchmark: creates and drops only its own UUID-named databases. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import type { DBClient, SQLClient } from "../../src/db/connectors/dbClient.js";
import { MysqlClient } from "../../src/db/connectors/mysql/client.js";
import { MysqlPoolClient } from "../../src/db/connectors/mysql/poolClient.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import { createSqlGenerator } from "../../src/db/sqlGenerator.js";
import { QExpr as q } from "../../src/runtime/dsl/factory.js";

const iterations = Number(process.env.BENCH_ITERATIONS ?? 100);
const rounds = Number(process.env.BENCH_ROUNDS ?? 3);
for (const n of [iterations, rounds]) assert(Number.isSafeInteger(n) && n > 0);
const warmup = 20;
const mysqlSettings = {
  host: process.env.TEST_DB_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT ?? 3308),
  user: process.env.TEST_DB_USER ?? "root",
  password: process.env.TEST_DB_PASSWORD ?? "",
  connectTimeout: 5000,
};
const pgSettings = {
  host: process.env.TEST_PG_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_PG_PORT ?? 5432),
  user: process.env.TEST_PG_USER ?? "postgres",
  password: process.env.TEST_PG_PASSWORD ?? "",
  connectionTimeoutMillis: 5000,
};
const tables = {
  bench_rows: {
    identifiableKeys: ["id"],
    identifiableFields: ["id"],
    columnMap: { id: "id", label: "label" },
  },
};
const shapes = [
  "select-one",
  "in-variable",
  "update",
  "bulk-eight",
  "bulk-variable",
] as const;
type Shape = (typeof shapes)[number];
let writeSequence = 0;
function operation(dialect: "mysql" | "postgres", shape: Shape, i: number) {
  const sql = createSqlGenerator(dialect);
  const id = (i % 256) + 1;
  if (shape === "select-one" || shape === "in-variable") {
    const count = shape === "select-one" ? 1 : [1, 4, 16][i % 3];
    const query = {
      select: [q.field("bench_rows", "id"), q.field("bench_rows", "label")],
      from: q.table("bench_rows", [], "bench_rows"),
      where: q.in(
        q.field("bench_rows", "id"),
        Array.from({ length: count }, (_, j) => ((id + j - 1) % 256) + 1),
      ),
      sort: [q.sort(q.field("bench_rows", "id"))],
    };
    return {
      read: true,
      raw: () => sql.query(query),
      bound: () => sql.compileQuery(query),
      count,
    };
  }
  if (shape === "update") {
    const mutation = {
      table: "bench_rows",
      values: [{ field: "label", value: `value-${i}-${writeSequence++}` }],
      where: q.eq(q.field("bench_rows", "id"), q.value(id)),
    };
    return {
      read: false,
      raw: () => sql.update(mutation, tables),
      bound: () => sql.compileUpdate(mutation, tables),
      count: 1,
    };
  }
  const count = shape === "bulk-eight" ? 8 : [1, 8, 32][i % 3];
  const mutation = {
    table: "bench_rows",
    fields: ["id", "label"],
    entities: Array.from({ length: count }, (_, j) => [
      j + 1,
      `batch-${i}-${j}`,
    ]),
    upsert: ["label"],
    conflictColumns: ["id"],
  };
  return {
    read: false,
    raw: () => sql.create(mutation, tables),
    bound: () => sql.compileCreate(mutation, tables),
    count,
  };
}
function summary(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50Ms: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms:
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
  };
}
async function runOperation(
  client: SQLClient,
  shape: Shape,
  mode: "raw" | "bound",
  i: number,
) {
  const op = operation(client.dialect, shape, i);
  if (op.read) {
    const rows =
      mode === "raw"
        ? await client.rawQuery(op.raw())
        : await client.executeQuery(op.bound());
    assert.equal(rows.length, op.count);
  } else if (mode === "raw") await client.rawCommand(op.raw());
  else await client.executeCommand(op.bound());
}
async function matrix(
  client: DBClient,
  name: string,
  transaction = false,
  concurrency = 1,
) {
  const tx = transaction ? await client.transaction() : undefined;
  const executor = tx ?? client;
  try {
    for (const shape of shapes) {
      const samples = { raw: [] as number[], bound: [] as number[] };
      const elapsed = { raw: [] as number[], bound: [] as number[] };
      for (let round = 0; round < rounds; round++) {
        const modes =
          round % 2 ? (["bound", "raw"] as const) : (["raw", "bound"] as const);
        for (const mode of modes) {
          // Writes deliberately run sequentially to avoid benchmarking conflicting-row locks.
          const workers =
            shape.startsWith("select") || shape === "in-variable"
              ? concurrency
              : 1;
          for (let i = 0; i < warmup; i++)
            await runOperation(executor, shape, mode, i);
          let next = 0;
          const started = performance.now();
          await Promise.all(
            Array.from({ length: workers }, async () => {
              while (next < iterations) {
                const i = next++;
                const before = performance.now();
                await runOperation(executor, shape, mode, i);
                samples[mode].push(performance.now() - before);
              }
            }),
          );
          elapsed[mode].push(performance.now() - started);
        }
      }
      console.log(
        JSON.stringify({
          kind: "timing",
          database: client.dialect,
          client: name,
          shape,
          iterations,
          rounds,
          concurrency:
            shape === "select-one" || shape === "in-variable" ? concurrency : 1,
          raw: { ...summary(samples.raw), roundMs: elapsed.raw },
          bound: { ...summary(samples.bound), roundMs: elapsed.bound },
        }),
      );
    }
  } finally {
    await tx?.rollback();
  }
}
async function transactions(client: DBClient, name: string) {
  const samples: number[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const before = performance.now();
    const tx = await client.transaction();
    try {
      const rows = await tx.rawQuery(
        client.dialect === "mysql"
          ? "SELECT CONNECTION_ID() AS id"
          : "SELECT pg_backend_pid() AS id",
      );
      ids.add(String(rows[0].id));
      await runOperation(tx, "select-one", "bound", i);
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    samples.push(performance.now() - before);
  }
  console.log(
    JSON.stringify({
      kind: "transactions",
      database: client.dialect,
      client: name,
      count: samples.length,
      connections: ids.size,
      ...summary(samples),
    }),
  );
}
async function mysqlCache(client: DBClient, label: string) {
  const tx = await client.transaction();
  const status = async () =>
    Object.fromEntries(
      (
        await tx.rawQuery(
          "SHOW SESSION STATUS WHERE Variable_name IN ('Com_stmt_prepare','Com_stmt_execute','Com_stmt_close')",
        )
      ).map((r) => [String(r.Variable_name), Number(r.Value)]),
    );
  try {
    for (const shape of [
      "select-one",
      "in-variable",
      "bulk-variable",
    ] as const) {
      const before = await status();
      const sqls = new Set<string>();
      for (let i = 0; i < 30; i++) {
        sqls.add(operation("mysql", shape, i).bound().text);
        await runOperation(tx, shape, "bound", i);
      }
      const after = await status();
      console.log(
        JSON.stringify({
          kind: "mysql-cache",
          label,
          shape,
          executions: 30,
          sqlShapes: sqls.size,
          delta: Object.fromEntries(
            Object.keys(after).map((k) => [k, after[k] - before[k]]),
          ),
        }),
      );
    }
  } finally {
    await tx.rollback();
  }
}
async function pgNamed(database: string) {
  const pool = new Pool({ ...pgSettings, database, max: 1 });
  const client = await pool.connect();
  try {
    for (const shape of ["select-one", "in-variable"] as const) {
      const samples = { unnamed: [] as number[], named: [] as number[] };
      for (let r = 0; r < rounds; r++)
        for (const mode of r % 2
          ? (["named", "unnamed"] as const)
          : (["unnamed", "named"] as const)) {
          for (let i = -warmup; i < iterations; i++) {
            const op = operation("postgres", shape, i + warmup);
            const statement = op.bound();
            const before = performance.now();
            const rows = await client.query({
              text: statement.text,
              values: [...statement.values],
              name:
                mode === "named"
                  ? `bench_${createHash("sha256").update(statement.text).digest("hex").slice(0, 48)}`
                  : undefined,
            });
            assert.equal(rows.rows.length, op.count);
            if (i >= 0) samples[mode].push(performance.now() - before);
          }
        }
      console.log(
        JSON.stringify({
          kind: "pg-named",
          shape,
          unnamed: summary(samples.unnamed),
          named: summary(samples.named),
        }),
      );
    }
    const result = await client.query(
      "SELECT name, generic_plans, custom_plans FROM pg_prepared_statements ORDER BY name",
    );
    console.log(JSON.stringify({ kind: "pg-plans", statements: result.rows }));
  } finally {
    client.release();
    await pool.end();
  }
}
console.log(
  JSON.stringify({
    kind: "environment",
    at: new Date().toISOString(),
    node: process.version,
    iterations,
    rounds,
    warmup,
    notes:
      "Latency includes compile and result-count checks; alternating warm rounds; no competing test runner. Named PG probe excludes compile. Synthetic 256-row table; not a production throughput claim.",
  }),
);
for (const dialect of ["mysql", "postgres"] as const) {
  const database = `sasat_bench_${randomUUID().replace(/-/g, "")}`;
  const admin =
    dialect === "mysql"
      ? new MysqlClient(mysqlSettings)
      : new PostgresClient({ ...pgSettings, database: "postgres" });
  const clients: DBClient[] = [];
  let created = false;
  try {
    await admin.rawCommand(`CREATE DATABASE ${admin.sql.escapeId(database)}`);
    created = true;
    const pool =
      dialect === "mysql"
        ? new MysqlPoolClient({
            ...mysqlSettings,
            database,
            connectionLimit: 1,
            maxPreparedStatements: 64,
          })
        : new PostgresClient({ ...pgSettings, database, max: 1 });
    clients.push(pool);
    console.log(
      JSON.stringify({
        kind: "server",
        dialect,
        version: await pool.rawQuery("SELECT VERSION() AS version"),
      }),
    );
    await pool.rawCommand(
      "CREATE TABLE bench_rows (id INTEGER PRIMARY KEY, label VARCHAR(100) NOT NULL)",
    );
    await pool.rawCommand(
      `INSERT INTO bench_rows VALUES ${Array.from({ length: 256 }, (_, i) => `(${i + 1},'seed')`).join(",")}`,
    );
    await matrix(pool, "pool-1");
    await matrix(pool, "transaction", true);
    await transactions(pool, "pool-1");
    const wide =
      dialect === "mysql"
        ? new MysqlPoolClient({
            ...mysqlSettings,
            database,
            connectionLimit: 4,
            maxPreparedStatements: 64,
          })
        : new PostgresClient({ ...pgSettings, database, max: 4 });
    clients.push(wide);
    await matrix(wide, "pool-4", false, 4);
    if (dialect === "mysql") {
      const fresh = new MysqlClient({ ...mysqlSettings, database });
      clients.push(fresh);
      await matrix(fresh, "new-connection");
      const probe = new MysqlPoolClient({
        ...mysqlSettings,
        database,
        connectionLimit: 1,
        maxPreparedStatements: 64,
      });
      clients.push(probe);
      await mysqlCache(probe, "cache-64");
      const small = new MysqlPoolClient({
        ...mysqlSettings,
        database,
        connectionLimit: 1,
        maxPreparedStatements: 2,
      });
      clients.push(small);
      await mysqlCache(small, "cache-2");
    } else await pgNamed(database);
  } finally {
    await Promise.all(clients.map((c) => c.release()));
    try {
      if (created)
        await admin.rawCommand(`DROP DATABASE ${admin.sql.escapeId(database)}`);
    } finally {
      await admin.release();
    }
  }
}
