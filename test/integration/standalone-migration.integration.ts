import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import type { DBClient } from "../../src/db/connectors/dbClient.js";
import { MysqlPoolClient } from "../../src/db/connectors/mysql/poolClient.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import { createSqlGenerator } from "../../src/db/sqlGenerator.js";
import { withMigrationLock } from "../../src/migration/exec/withMigrationLock.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { standaloneFixture } from "../package/standalone-fixture.js";

const execute = promisify(execFile);

for (const dialect of ["mysql", "postgres"] as const) {
  test(`standalone ${dialect}: relocated apply, dry, hooks, retry, down and lock`, {
    timeout: 120000,
  }, async () => {
    const postgres = dialect === "postgres";
    const source = mkdtempSync(
      path.join(tmpdir(), "sasat-standalone-live-build-"),
    );
    const deploy = mkdtempSync(
      path.join(tmpdir(), "sasat-standalone live #%-"),
    );
    const database = `sasat_bundle_${randomUUID().replace(/-/g, "")}`;
    const settings = {
      host:
        process.env[postgres ? "TEST_PG_HOST" : "TEST_DB_HOST"] ?? "127.0.0.1",
      port: Number(
        process.env[postgres ? "TEST_PG_PORT" : "TEST_DB_PORT"] ??
          (postgres ? 5432 : 3308),
      ),
      user:
        process.env[postgres ? "TEST_PG_USER" : "TEST_DB_USER"] ??
        (postgres ? "postgres" : "root"),
      password:
        process.env[postgres ? "TEST_PG_PASSWORD" : "TEST_DB_PASSWORD"] ?? "",
    };
    const connect = (database?: string): DBClient =>
      postgres
        ? new PostgresClient({
            ...settings,
            database: database ?? "postgres",
            max: 1,
          })
        : new MysqlPoolClient({ ...settings, database });
    const admin = connect();
    let db: DBClient | undefined;
    let created = false;
    try {
      const build = standaloneFixture(source, dialect);
      // Initial schema describes an existing table and must travel inside the bundle.
      const initial = StoreMigrator.deserialize(
        { tables: [] },
        createSqlGenerator(dialect),
      );
      initial.createTable("baseline", (t) => t.column("id").int().primary());
      writeFileSync(
        path.join(source, "migrations/initialSchema.yml"),
        JSON.stringify(initial.serialize()),
      );
      writeFileSync(
        path.join(source, "migrations/001.ts"),
        `
import pluralize from "pluralize";
import { appendFileSync } from "node:fs";
appendFileSync("module-loaded", "loaded\\n");
export default class Migration {
  up(store) {
    store.table("baseline");
    store.createTable(pluralize("entry"), t => {
      t.column("id").int().primary();
      t.column("label").varchar(40);
    });
  }
  down(store) { store.dropTable("entries"); }
  beforeUp() { appendFileSync("events", "001:before\\n"); }
  async afterUp({db}) { await db.rawCommand("INSERT INTO entries VALUES (1, 'first')"); }
  afterCommitUp() { appendFileSync("events", "001:commit\\n"); }
}
`,
      );
      writeFileSync(
        path.join(source, "migrations/002.ts"),
        `
import { existsSync, appendFileSync } from "node:fs";
export default class Migration {
  up(store) { store.sql("INSERT INTO entries VALUES (2, 'second')"); }
  down(store) { store.sql("DELETE FROM entries WHERE id = 2"); }
  afterUp() { if (existsSync("fail")) throw Error("injected failure"); }
  afterCommitUp() { appendFileSync("events", "002:commit\\n"); }
  afterDown() { appendFileSync("events", "002:down\\n"); }
}
`,
      );
      const built = build();
      assert.equal(built.status, 0, built.stderr);
      assert.equal(existsSync(path.join(source, "module-loaded")), false);
      copyFileSync(
        path.join(source, "migration.cjs"),
        path.join(deploy, "migration.cjs"),
      );
      rmSync(source, { recursive: true, force: true });
      await admin.rawQuery(`CREATE DATABASE ${admin.sql.escapeId(database)}`);
      created = true;
      db = connect(database);
      await db.rawCommand("CREATE TABLE baseline (id INT PRIMARY KEY)");
      writeFileSync(
        path.join(deploy, "deploy.yml"),
        JSON.stringify({
          db: {
            dialect,
            host: "$BUNDLE_HOST",
            port: "$BUNDLE_PORT",
            user: "$BUNDLE_USER",
            password: "$BUNDLE_PASSWORD",
            database,
          },
          migration: { dir: "source-does-not-exist", table: "history" },
        }),
      );
      const run = (...args: string[]) =>
        execute(
          process.execPath,
          [
            path.join(deploy, "migration.cjs"),
            "--config",
            path.join(deploy, "deploy.yml"),
            ...args,
          ],
          {
            cwd: deploy,
            timeout: 20000,
            env: {
              ...process.env,
              NODE_OPTIONS: "",
              NODE_PATH: "",
              BUNDLE_HOST: settings.host,
              BUNDLE_PORT: String(settings.port),
              BUNDLE_USER: settings.user,
              BUNDLE_PASSWORD: settings.password,
            },
          },
        );
      const history = async () =>
        (
          await db!.rawQuery("SELECT name, direction FROM history ORDER BY id")
        ).map((r) => `${r.name}:${r.direction}`);
      const rows = async () =>
        Number((await db!.rawQuery("SELECT COUNT(*) AS n FROM entries"))[0].n);
      const events = () => readFileSync(path.join(deploy, "events"), "utf8");
      assert.match((await run("--dry")).stdout, /CREATE TABLE/);
      assert.equal(existsSync(path.join(deploy, "events")), false);
      await assert.rejects(db.rawQuery("SELECT * FROM history"));
      await run("--target", "001.ts", "--silent");
      assert.equal(await rows(), 1);
      assert.deepEqual(await history(), ["001.ts:up"]);
      writeFileSync(path.join(deploy, "fail"), "");
      await assert.rejects(run("--silent"), /injected failure/);
      assert.equal(await rows(), 1);
      assert.deepEqual(await history(), ["001.ts:up"]);
      rmSync(path.join(deploy, "fail"));
      await run("--silent");
      assert.equal(await rows(), 2);
      const appliedEvents = events();
      await run("--silent");
      assert.equal(events(), appliedEvents);
      await run("--target", "001.ts", "--silent");
      assert.equal(await rows(), 1);
      assert.deepEqual(await history(), [
        "001.ts:up",
        "002.ts:up",
        "002.ts:down",
      ]);
      await run("--silent");
      await withMigrationLock(db, async () => {
        await assert.rejects(
          run("--silent"),
          /Another Sasat migration is running/,
        );
      });
      assert.equal(await rows(), 2);
      assert.ok(!existsSync(path.join(deploy, "node_modules")));
      assert.ok(!existsSync(path.join(deploy, "source-does-not-exist")));
    } finally {
      await db?.release();
      if (created)
        await admin.rawQuery(`DROP DATABASE ${admin.sql.escapeId(database)}`);
      await admin.release();
      rmSync(source, { recursive: true, force: true });
      rmSync(deploy, { recursive: true, force: true });
    }
  });
}
