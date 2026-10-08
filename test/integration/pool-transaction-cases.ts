import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { SQLTransaction } from "../../src/db/connectors/dbClient.js";
import { MysqlClient } from "../../src/db/connectors/mysql/client.js";
import { MysqlPoolClient } from "../../src/db/connectors/mysql/poolClient.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import { verifyBulkInsert } from "./bulk-insert-cases.js";
import { verifyPublishFailure } from "./publish-failure-cases.js";

export async function verifyPooledTransactions(dialect: "mysql" | "postgres") {
  const mysql = dialect === "mysql";
  const database = `sasat_pool_${randomUUID().replace(/-/g, "")}`;
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
  const admin = mysql
    ? new MysqlClient(mysqlSettings)
    : new PostgresClient({ ...pgSettings, database: "postgres" });
  const client = mysql
    ? new MysqlPoolClient({ ...mysqlSettings, database, connectionLimit: 2 })
    : new PostgresClient({ ...pgSettings, database, max: 2 });
  const single = mysql
    ? new MysqlPoolClient({ ...mysqlSettings, database, connectionLimit: 1 })
    : new PostgresClient({ ...pgSettings, database, max: 1 });
  const identity = mysql
    ? "SELECT CONNECTION_ID() AS id"
    : "SELECT pg_backend_pid() AS id";
  let created = false;
  try {
    await admin.rawCommand(`CREATE DATABASE ${admin.sql.escapeId(database)}`);
    created = true;
    await client.rawCommand("CREATE TABLE pool_rows (id INTEGER PRIMARY KEY)");
    const ids = new Set<string>();
    let active = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const tx = await client.transaction();
        active++;
        peak = Math.max(peak, active);
        try {
          const id = String((await tx.rawQuery(identity))[0].id);
          ids.add(id);
          await tx.executeCommand({
            text: `INSERT INTO pool_rows VALUES (${mysql ? "?" : "$1"})`,
            values: [i],
          });
          await tx.rawQuery(
            mysql ? "SELECT SLEEP(0.01)" : "SELECT pg_sleep(0.01)",
          );
          assert.equal(String((await tx.rawQuery(identity))[0].id), id);
          if (i % 2) await tx.commit();
          else await tx.rollback();
          await tx.rollback(); // A stale handle must not finish another borrower's transaction.
          await assert.rejects(async () => tx.rawQuery("SELECT 1"), /finished/);
          await assert.rejects(
            tx.executeQuery({ text: "SELECT 1", values: [] }),
            /finished/,
          );
        } catch (error) {
          await tx.rollback();
          throw error;
        } finally {
          active--;
        }
      }),
    );
    assert.equal(peak, 2);
    assert.equal(ids.size, 2);
    assert.deepEqual(
      (await client.rawQuery("SELECT id FROM pool_rows ORDER BY id")).map(
        (r) => r.id,
      ),
      [1, 3, 5, 7, 9, 11],
    );
    const first = await single.transaction();
    const before = String((await first.rawQuery(identity))[0].id);
    const cached = {
      text: "SELECT ? AS value /* pool-transaction-cache */",
      values: [42],
    };
    if (mysql) await first.executeQuery(cached);
    await first.commit();
    const second = await single.transaction();
    assert.equal(String((await second.rawQuery(identity))[0].id), before);
    if (mysql) {
      const statusSql = "SHOW SESSION STATUS LIKE 'Com_stmt_prepare'";
      const count = (await second.rawQuery(statusSql))[0].Value;
      assert.equal((await second.executeQuery(cached))[0].value, 42);
      assert.equal((await second.rawQuery(statusSql))[0].Value, count);
    }
    await second.executeCommand({
      text: `INSERT INTO pool_rows VALUES (${mysql ? "?" : "$1"})`,
      values: [100],
    });
    await second.discard();
    await second.discard();
    const third = await single.transaction();
    try {
      assert.notEqual(String((await third.rawQuery(identity))[0].id), before);
      assert.deepEqual(
        await third.rawQuery("SELECT id FROM pool_rows WHERE id=100"),
        [],
      );
      await assert.rejects(
        third.rawCommand("INSERT INTO pool_rows VALUES (1)"),
      );
    } finally {
      await third.rollback();
    }
    assert.equal(
      (await single.rawQuery("SELECT COUNT(*) AS total FROM pool_rows"))[0]
        .total,
      6n,
    );
    if (mysql) {
      // A real network/session failure must remove the borrowed connection.
      for (const action of ["commit", "rollback"] as const) {
        const tx = await single.transaction();
        const id = String((await tx.rawQuery(identity))[0].id);
        assert.match(id, /^\d+$/);
        await admin.rawCommand(`KILL CONNECTION ${id}`);
        await assert.rejects(tx[action]());
        await tx.rollback();
        const next = await single.transaction();
        try {
          assert.notEqual(String((await next.rawQuery(identity))[0].id), id);
        } finally {
          await next.rollback();
        }
      }
      const bounded = new MysqlPoolClient({
        ...mysqlSettings,
        database,
        connectionLimit: 1,
        waitForConnections: true,
        queueLimit: 1,
      });
      let held: SQLTransaction | undefined;
      let queued: Promise<SQLTransaction> | undefined;
      try {
        held = await bounded.transaction();
        queued = bounded.transaction();
        await assert.rejects(bounded.transaction(), /Queue limit/);
        await assert.rejects(bounded.rawQuery("SELECT 1"), /Queue limit/);
        await held.rollback();
        held = undefined;
        const resumed = await queued;
        queued = undefined;
        await resumed.rollback();
      } finally {
        await held?.rollback();
        if (queued) await (await queued).rollback();
        await bounded.release();
      }
    }
    // Both generated GraphQL writes and bulk calls must still work for old
    // custom executors that provide only the original string methods.
    const legacy = {
      sql: client.sql,
      rawQuery: client.rawQuery.bind(client),
      rawCommand: client.rawCommand.bind(client),
    };
    await verifyBulkInsert(legacy, dialect);
    await verifyPublishFailure(legacy, dialect);
    const failFast = mysql
      ? new MysqlPoolClient({
          ...mysqlSettings,
          database,
          connectionLimit: 1,
          waitForConnections: false,
        })
      : new PostgresClient({
          ...pgSettings,
          database,
          max: 1,
          connectionTimeoutMillis: 100,
        });
    let occupied: SQLTransaction | undefined;
    try {
      occupied = await failFast.transaction();
      await assert.rejects(
        failFast.transaction(),
        mysql ? /No connections available/ : /timeout exceeded/,
      );
      await occupied.rollback();
      occupied = undefined;
      const recovered = await failFast.transaction();
      await recovered.rollback();
    } finally {
      await occupied?.rollback();
      await failFast.release();
    }
    await client.release();
    await client.release();
    await assert.rejects(client.transaction(), /released/);
  } finally {
    await client.release();
    await single.release();
    try {
      if (created)
        await admin.rawCommand(`DROP DATABASE ${admin.sql.escapeId(database)}`);
    } finally {
      await admin.release();
    }
  }
}
