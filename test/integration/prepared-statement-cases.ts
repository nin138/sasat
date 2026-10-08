import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { DBClient } from "../../src/db/connectors/dbClient.js";
import { MysqlClient } from "../../src/db/connectors/mysql/client.js";
import { MysqlPoolClient } from "../../src/db/connectors/mysql/poolClient.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import type { SqlParameter } from "../../src/db/sqlStatement.js";

export async function verifyPreparedStatements(
  kind: "mysql" | "mysql-pool" | "postgres",
) {
  const postgres = kind === "postgres";
  const database = `sasat_prepared_${randomUUID().replace(/-/g, "")}`;
  const mysqlSettings = {
    host: process.env.TEST_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.TEST_DB_PORT ?? 3308),
    user: process.env.TEST_DB_USER ?? "root",
    password: process.env.TEST_DB_PASSWORD ?? "",
    connectTimeout: 5000,
    charset: "utf8mb4",
    timezone: "Z",
  };
  const pgSettings = {
    host: process.env.TEST_PG_HOST ?? "127.0.0.1",
    port: Number(process.env.TEST_PG_PORT ?? 5432),
    user: process.env.TEST_PG_USER ?? "postgres",
    password: process.env.TEST_PG_PASSWORD ?? "",
    connectionTimeoutMillis: 5000,
    max: 1,
  };
  const admin = postgres
    ? new PostgresClient({ ...pgSettings, database: "postgres" })
    : new MysqlClient(mysqlSettings);
  const client: DBClient = postgres
    ? new PostgresClient({ ...pgSettings, database })
    : kind === "mysql-pool"
      ? new MysqlPoolClient({ ...mysqlSettings, database, connectionLimit: 1 })
      : new MysqlClient({ ...mysqlSettings, database });
  const placeholders = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      postgres ? `$${i + 1}` : "?",
    ).join(", ");
  const statement = (text: string, values: readonly SqlParameter[] = []) => ({
    text,
    values,
  });
  const idParam = postgres ? "$1" : "?";
  let created = false;
  try {
    await admin.rawCommand(`CREATE DATABASE ${admin.sql.escapeId(database)}`);
    created = true;
    await client.rawCommand(
      "CREATE TABLE samples (id BIGINT PRIMARY KEY, amount DECIMAL(38,18), label TEXT, optional BIGINT NULL, flag BOOLEAN, happened DATE)",
    );
    const text = "quote'\\backslash 日本語 😀 ? $1; --";
    const amount = "12345678901234567890.123456789012345678";
    const insertText = `INSERT INTO samples (id, amount, label, optional, flag, happened) VALUES (${placeholders(6)})`;
    const selectText = `SELECT * FROM samples WHERE id = ${idParam}`;
    const ids = [
      0n,
      2147483647n,
      2147483648n,
      9007199254740991n,
      9007199254740992n,
      9007199254740993n,
      -9223372036854775808n,
      9223372036854775807n,
    ];
    for (const id of ids) {
      const result = await client.executeCommand(
        statement(insertText, [
          id,
          amount,
          text,
          null,
          false,
          new Date("2026-10-08T00:00:00Z"),
        ]),
      );
      assert.equal(result.affectedRows, 1);
      const [row] = await client.executeQuery(statement(selectText, [id]));
      assert.equal(row.id, id);
      assert.equal(row.amount, amount);
      assert.equal(row.label, text);
      assert.equal(row.optional, null);
      assert.equal(row.flag, postgres ? false : 0);
      assert.equal(row.happened, "2026-10-08");
      // Verify the existing text-protocol path still returns the same public types.
      assert.deepEqual(
        await client.rawQuery(`SELECT * FROM samples WHERE id = ${id}`),
        [row],
      );
    }
    assert.deepEqual(
      await client.executeQuery(
        statement(`SELECT id FROM samples WHERE label = ${idParam}`, [
          "x' OR 1=1; DROP TABLE samples; --",
        ]),
      ),
      [],
    );
    const changed = await client.executeCommand(
      statement(
        `UPDATE samples SET amount = ${idParam} WHERE id = ${postgres ? "$2" : "?"}`,
        ["-0.000000000000000001", 0n],
      ),
    );
    assert.equal(changed.affectedRows, 1);
    assert.equal(changed.changedRows, 1);
    const tx = await client.transaction();
    try {
      await tx.executeCommand(
        statement(insertText, [
          42n,
          "1.0",
          "rollback",
          9223372036854775807n,
          true,
          null,
        ]),
      );
      const [row] = await tx.executeQuery(statement(selectText, [42n]));
      assert.equal(row.optional, 9223372036854775807n);
      assert.equal(row.flag, postgres ? true : 1);
      await assert.rejects(
        tx.executeCommand(
          statement(insertText, [42n, "1.0", "duplicate", null, false, null]),
        ),
      );
    } finally {
      await tx.rollback();
    }
    assert.deepEqual(
      await client.executeQuery(statement(selectText, [42n])),
      [],
    );
    const committed = await client.transaction();
    try {
      await committed.executeCommand(
        statement(insertText, [43n, "1.0", "commit", null, true, null]),
      );
      await committed.commit();
    } catch (error) {
      await committed.rollback();
      throw error;
    }
    assert.equal(
      (await client.executeQuery(statement(selectText, [43n])))[0].id,
      43n,
    );
    await assert.rejects(
      client.executeQuery(statement("SELECT * FROM missing_table")),
    );
    assert.equal(
      (await client.executeQuery(statement(selectText, [43n])))[0].id,
      43n,
    );
    const deleted = await client.executeCommand(
      statement(`DELETE FROM samples WHERE id = ${idParam}`, [43n]),
    );
    assert.equal(deleted.affectedRows, 1);
    await client.rawCommand(
      postgres
        ? "CREATE TABLE generated_ids (id BIGINT GENERATED BY DEFAULT AS IDENTITY (START WITH 9007199254740993) PRIMARY KEY, label TEXT)"
        : "CREATE TABLE generated_ids (id BIGINT AUTO_INCREMENT PRIMARY KEY, label TEXT) AUTO_INCREMENT = 9007199254740993",
    );
    const generated = await client.executeCommand(
      statement(
        `INSERT INTO generated_ids(label) VALUES (${idParam})${postgres ? " RETURNING id AS __sasat_insert_id" : ""}`,
        ["generated"],
      ),
    );
    assert.equal(generated.insertId, 9007199254740993n);
    if (!postgres) {
      await client.rawCommand(
        "CREATE TABLE unsigned_ids (id BIGINT UNSIGNED PRIMARY KEY)",
      );
      await client.executeCommand(
        statement("INSERT INTO unsigned_ids VALUES (?)", [
          18446744073709551615n,
        ]),
      );
      assert.equal(
        (await client.executeQuery(statement("SELECT id FROM unsigned_ids")))[0]
          .id,
        18446744073709551615n,
      );
    }
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
