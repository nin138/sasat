import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { DBClient } from "../../src/db/connectors/dbClient.js";
import { MysqlClient } from "../../src/db/connectors/mysql/client.js";
import { MysqlPoolClient } from "../../src/db/connectors/mysql/poolClient.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import {
  TransactionCommitError,
  type TransactionExecutor,
  type TransactionOptions,
} from "../../src/db/managedTransaction.js";
import { SasatDBDatasource } from "../../src/runtime/sasatDBDatasource.js";

type Dialect = "mysql" | "postgres";
class Rows extends SasatDBDatasource<
  { id: number; label: string },
  { id: number },
  { id: number; label: string },
  { id: number; label?: string },
  { fields: ("id" | "label")[] },
  { id: number; label: string }
> {
  tableName = "managed_rows";
  fields = ["id", "label"];
  primaryKeys = ["id"];
  identifyFields = ["id"];
  autoIncrementColumn = undefined;
  relationMap = { managed_rows: {} };
  tableInfo = {
    managed_rows: {
      identifiableKeys: ["id"],
      identifiableFields: ["id"],
      columnMap: { id: "id", label: "label" },
    },
  };
  getDefaultValueString() {
    return {};
  }
}

async function withDatabase(
  dialect: Dialect,
  limit: number,
  run: (client: DBClient, admin: DBClient) => Promise<void>,
) {
  const database = `sasat_managed_${randomUUID().replace(/-/g, "")}`;
  const mysql = {
    host: process.env.TEST_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.TEST_DB_PORT ?? 3308),
    user: process.env.TEST_DB_USER ?? "root",
    password: process.env.TEST_DB_PASSWORD ?? "",
    connectTimeout: 5000,
  };
  const pg = {
    host: process.env.TEST_PG_HOST ?? "127.0.0.1",
    port: Number(process.env.TEST_PG_PORT ?? 5432),
    user: process.env.TEST_PG_USER ?? "postgres",
    password: process.env.TEST_PG_PASSWORD ?? "",
    connectionTimeoutMillis: 5000,
  };
  const admin =
    dialect === "mysql"
      ? new MysqlClient(mysql)
      : new PostgresClient({ ...pg, database: "postgres" });
  const client =
    dialect === "mysql"
      ? new MysqlPoolClient({ ...mysql, database, connectionLimit: limit })
      : new PostgresClient({ ...pg, database, max: limit });
  let created = false;
  try {
    await admin.rawCommand(`CREATE DATABASE ${admin.sql.escapeId(database)}`);
    created = true;
    await client.rawCommand(
      "CREATE TABLE managed_rows (id INTEGER PRIMARY KEY, label VARCHAR(100))",
    );
    await client.rawCommand(
      "INSERT INTO managed_rows VALUES (1,'seed'),(2,'seed'),(3,'seed')",
    );
    await run(client, admin);
  } finally {
    await client.release();
    try {
      if (created)
        await admin.rawCommand(`DROP DATABASE ${admin.sql.escapeId(database)}`);
    } finally {
      await admin.release();
    }
  }
}
const identity = (dialect: Dialect) =>
  dialect === "mysql"
    ? "SELECT CONNECTION_ID() AS id"
    : "SELECT pg_backend_pid() AS id";
const state = (dialect: Dialect) =>
  dialect === "mysql"
    ? "SELECT @@SESSION.time_zone AS setting, @sasat_managed AS marker"
    : "SELECT current_setting('application_name') AS setting";
async function changeSession(tx: TransactionExecutor, dialect: Dialect) {
  if (dialect === "mysql") {
    await tx.rawCommand("SET SESSION time_zone = '+03:00'");
    await tx.rawCommand("SET @sasat_managed = 'residual'");
  } else
    await tx.rawCommand(
      "SET SESSION application_name = 'sasat-managed-session'",
    );
  await tx.rawCommand("CREATE TEMPORARY TABLE managed_temp (id INTEGER)");
}

export async function verifyManagedTransactions(dialect: Dialect) {
  await withDatabase(dialect, 1, async (client, admin) => {
    const initialId = String((await client.rawQuery(identity(dialect)))[0].id);
    let old!: TransactionExecutor;
    const result = await client.withTransaction(async (tx) => {
      old = tx;
      for (const key of [
        "commit",
        "rollback",
        "discard",
        "transaction",
        "release",
      ])
        assert.equal(key in tx, false);
      const rows = new Rows(tx);
      const entity = await rows.create({ id: 10, label: "created" });
      await rows.update({ id: 10, label: "updated" });
      assert.equal((await rows.find()).length, 4);
      return entity.id;
    });
    assert.equal(result, 10);
    assert.equal(
      (await client.rawQuery("SELECT label FROM managed_rows WHERE id=10"))[0]
        .label,
      "updated",
    );
    assert.equal(
      String((await client.rawQuery(identity(dialect)))[0].id),
      initialId,
    );
    await client.withTransaction(async (tx) => {
      await assert.rejects(
        old.rawCommand("DELETE FROM managed_rows"),
        /finished/,
      );
      await tx.executeQuery({
        text: dialect === "mysql" ? "SELECT ? AS n" : "SELECT $1::integer AS n",
        values: [1],
      });
    });
    const error = new Error("callback failed");
    await assert.rejects(
      client.withTransaction(async (tx) => {
        await new Rows(tx).create({ id: 11, label: "rollback" });
        throw error;
      }),
      (e) => e === error,
    );
    assert.deepEqual(
      await client.rawQuery("SELECT id FROM managed_rows WHERE id=11"),
      [],
    );
    await assert.rejects(
      client.withTransaction(async (tx) => {
        const rows = new Rows(tx);
        await rows.create({ id: 12, label: "must rollback" });
        await rows.create({ id: 10, label: "duplicate" }).catch(() => {});
        return "swallowed";
      }),
    );
    assert.deepEqual(
      await client.rawQuery("SELECT id FROM managed_rows WHERE id=12"),
      [],
    );
    if (dialect === "mysql") {
      const query = { text: "SELECT ? AS n /* managed-cache */", values: [42] };
      await client.withTransaction(async (tx) => {
        await tx.executeQuery(query);
      });
      const before = (
        await client.rawQuery("SHOW SESSION STATUS LIKE 'Com_stmt_prepare'")
      )[0].Value;
      await client.withTransaction(async (tx) => {
        await tx.executeQuery(query);
      });
      assert.equal(
        (
          await client.rawQuery("SHOW SESSION STATUS LIKE 'Com_stmt_prepare'")
        )[0].Value,
        before,
      );
    }
    const baseline = await client.rawQuery(state(dialect));
    let changedId = "";
    const options: TransactionOptions & { connection: "reuse" | "discard" } = {
      connection: "discard",
    };
    const committed = client.withTransaction(async (tx) => {
      changedId = String((await tx.rawQuery(identity(dialect)))[0].id);
      await changeSession(tx, dialect);
      await new Rows(tx).create({ id: 13, label: "saved before discard" });
      return 13;
    }, options);
    options.connection = "reuse"; // Options must be captured before acquisition waits.
    assert.equal(await committed, 13);
    assert.notEqual(
      String((await client.rawQuery(identity(dialect)))[0].id),
      changedId,
    );
    assert.deepEqual(await client.rawQuery(state(dialect)), baseline);
    await assert.rejects(client.rawQuery("SELECT * FROM managed_temp"));
    assert.equal(
      (await client.rawQuery("SELECT id FROM managed_rows WHERE id=13"))[0].id,
      13,
    );
    await assert.rejects(
      client.withTransaction(
        async (tx) => {
          changedId = String((await tx.rawQuery(identity(dialect)))[0].id);
          await changeSession(tx, dialect);
          await new Rows(tx).create({ id: 14, label: "discarded rollback" });
          throw error;
        },
        { connection: "discard" },
      ),
      (e) => e === error,
    );
    assert.notEqual(
      String((await client.rawQuery(identity(dialect)))[0].id),
      changedId,
    );
    assert.deepEqual(await client.rawQuery(state(dialect)), baseline);
    assert.deepEqual(
      await client.rawQuery("SELECT id FROM managed_rows WHERE id=14"),
      [],
    );
    await assert.rejects(client.rawQuery("SELECT * FROM managed_temp"));
    const ids = new Set<string>();
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        client.withTransaction(async (tx) => {
          ids.add(String((await tx.rawQuery(identity(dialect)))[0].id));
          await new Rows(tx).create({ id: 100 + i, label: "concurrent" });
        }),
      ),
    );
    assert.equal(ids.size, 1);
    assert.equal(
      (await client.rawQuery("SELECT id FROM managed_rows WHERE id>=100"))
        .length,
      12,
    );
    if (dialect === "mysql") {
      let calls = 0;
      await assert.rejects(
        client.withTransaction(async (tx) => {
          calls++;
          const id = String((await tx.rawQuery(identity(dialect)))[0].id);
          assert.match(id, /^\d+$/);
          await tx.rawCommand(
            "INSERT INTO managed_rows VALUES (50,'lost before commit')",
          );
          await admin.rawCommand(`KILL CONNECTION ${id}`);
        }),
        (e) => e instanceof TransactionCommitError,
      );
      assert.equal(calls, 1);
      assert.deepEqual(
        await client.rawQuery("SELECT id FROM managed_rows WHERE id=50"),
        [],
      );
    }
  });
}

export async function verifyManagedDeadlock(dialect: Dialect) {
  await withDatabase(dialect, 2, async (client) => {
    let ready = 0;
    let start!: () => void;
    const barrier = new Promise<void>((resolve) => {
      start = resolve;
    });
    const outcomes = await Promise.allSettled(
      [0, 1].map((i) =>
        client.withTransaction(
          async (tx) => {
            await tx.rawCommand(
              dialect === "mysql"
                ? "SET SESSION innodb_lock_wait_timeout = 5"
                : "SET LOCAL lock_timeout = '5s'",
            );
            await tx.rawCommand(
              `UPDATE managed_rows SET label='worker-${i}' WHERE id=${i + 1}`,
            );
            ready++;
            if (ready === 2) start();
            await barrier;
            await Promise.all([
              tx.rawCommand(
                `UPDATE managed_rows SET label='worker-${i}' WHERE id=${2 - i}`,
              ),
              tx.rawCommand(
                `UPDATE managed_rows SET label='worker-${i}' WHERE id=3`,
              ),
            ]);
            return i;
          },
          { connection: "discard" },
        ),
      ),
    );
    const winners = outcomes.filter((r) => r.status === "fulfilled");
    const losers = outcomes.filter((r) => r.status === "rejected");
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    const loser = losers[0];
    assert.equal(loser.status, "rejected");
    assert.equal(
      loser.reason.code,
      dialect === "mysql" ? "ER_LOCK_DEADLOCK" : "40P01",
    );
    const winner = winners[0];
    assert.equal(winner.status, "fulfilled");
    const rows = await client.rawQuery(
      "SELECT label FROM managed_rows ORDER BY id",
    );
    assert.deepEqual(
      rows.map((r) => r.label),
      Array(3).fill(`worker-${winner.value}`),
    );
    await client.withTransaction(async (tx) => {
      await tx.rawCommand(
        "UPDATE managed_rows SET label='recovered' WHERE id=1",
      );
    });
  });
}

export async function verifyManagedLockTimeout(dialect: Dialect) {
  await withDatabase(dialect, 2, async (client) => {
    const holder = await client.transaction({ connection: "discard" });
    try {
      await holder.rawCommand(
        "UPDATE managed_rows SET label='held' WHERE id=1",
      );
      let sqlError: unknown;
      await assert.rejects(
        client.withTransaction(
          async (tx) => {
            await tx.rawCommand(
              dialect === "mysql"
                ? "SET SESSION innodb_lock_wait_timeout = 1"
                : "SET LOCAL lock_timeout = '100ms'",
            );
            await tx.rawCommand(
              "UPDATE managed_rows SET label='must rollback' WHERE id=2",
            );
            try {
              await tx.rawCommand(
                "UPDATE managed_rows SET label='blocked' WHERE id=1",
              );
            } catch (error) {
              sqlError = error;
            }
            await assert.rejects(
              tx.rawCommand(
                "UPDATE managed_rows SET label='must not execute' WHERE id=3",
              ),
              (e) => e === sqlError,
            );
          },
          { connection: "discard" },
        ),
        (e) =>
          e === sqlError &&
          (e as { code: string }).code ===
            (dialect === "mysql" ? "ER_LOCK_WAIT_TIMEOUT" : "55P03"),
      );
      assert.deepEqual(
        (
          await client.rawQuery(
            "SELECT label FROM managed_rows WHERE id IN (2,3) ORDER BY id",
          )
        ).map((r) => r.label),
        ["seed", "seed"],
      );
    } finally {
      await holder.rollback();
    }
    await client.withTransaction(async (tx) => {
      await tx.rawCommand(
        "UPDATE managed_rows SET label='recovered' WHERE id=1",
      );
    });
    assert.equal(
      (await client.rawQuery("SELECT label FROM managed_rows WHERE id=1"))[0]
        .label,
      "recovered",
    );
  });
}
