import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import type { DBClient } from "../../src/db/connectors/dbClient.js";
import { MysqlPoolClient } from "../../src/db/connectors/mysql/poolClient.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import type { DatabaseDialect } from "../../src/db/dialect.js";
import { withMigrationLock } from "../../src/migration/exec/withMigrationLock.js";

const execute = promisify(execFile);
const tsx = resolve("node_modules/tsx/dist/cli.mjs");
const cli = resolve("src/cli/index.ts");
const tsconfig = resolve("tsconfig.json");

export function migrationLifecycleCases(dialect: DatabaseDialect) {
  const postgres = dialect === "postgres";
  const directory = mkdtempSync(join(tmpdir(), `sasat-hooks-${dialect}-`));
  const database = `sasat_hooks_${randomUUID().replace(/-/g, "")}`;
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
  const makeClient = (database?: string): DBClient =>
    postgres
      ? new PostgresClient({
          ...settings,
          database: database ?? "postgres",
          max: 1,
        })
      : new MysqlPoolClient({ ...settings, database });
  const admin = makeClient();
  let client: DBClient;
  let created = false;
  const sessionId = postgres ? "pg_backend_pid()" : "CONNECTION_ID()";
  const events = () =>
    existsSync(join(directory, "events"))
      ? readFileSync(join(directory, "events"), "utf8").trim().split("\n")
      : [];
  function configuration(target?: string) {
    writeFileSync(
      join(directory, "sasat.yml"),
      JSON.stringify({
        db: {
          dialect,
          host: "$HOOK_DB_HOST",
          port: "$HOOK_DB_PORT",
          user: "$HOOK_DB_USER",
          password: "$HOOK_DB_PASSWORD",
          database,
          ...(postgres ? { max: 1 } : {}),
        },
        migration: {
          dir: ".",
          out: "generated",
          table: "history",
          ...(target ? { target } : {}),
        },
      }),
    );
  }
  function migration(name: string, body: string) {
    writeFileSync(
      join(directory, name + ".ts"),
      `import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
const record = (event) => appendFileSync("events", event + "\\n");
export default class Migration { ${body} }`,
    );
  }
  function run(command = "migrate", ...flags: string[]) {
    return execute(
      process.execPath,
      [tsx, "--tsconfig", tsconfig, cli, command, ...flags],
      {
        cwd: directory,
        timeout: 25_000,
        env: {
          ...process.env,
          HOOK_DB_HOST: settings.host,
          HOOK_DB_PORT: String(settings.port),
          HOOK_DB_USER: settings.user,
          HOOK_DB_PASSWORD: settings.password,
        },
      },
    );
  }
  async function history() {
    return (
      await client.rawQuery("SELECT name, direction FROM history ORDER BY id")
    ).map(({ name, direction }) => `${name}:${direction}`);
  }
  async function count(table: string) {
    return Number(
      (await client.rawQuery(`SELECT COUNT(*) AS n FROM ${table}`))[0].n,
    );
  }
  async function hasTable(table: string) {
    const scope = postgres
      ? "table_schema = 'public'"
      : "table_schema = DATABASE()";
    return (
      Number(
        (
          await client.rawQuery(
            `SELECT COUNT(*) AS n FROM information_schema.tables WHERE ${scope} AND table_name = '${table}'`,
          )
        )[0].n,
      ) > 0
    );
  }
  before(async () => {
    await admin.rawQuery(`CREATE DATABASE ${admin.sql.escapeId(database)}`);
    created = true;
    client = makeClient(database);
    configuration();
    migration(
      "001_first",
      `
      up(store) { store.sql("CREATE TABLE entries (id INT PRIMARY KEY)"); }
      down(store) { store.sql("DROP TABLE entries"); }
      async beforeUp({db}) { this.session = (await db.rawQuery("SELECT ${sessionId} AS id"))[0].id; record("001:beforeUp"); }
      async afterUp({db}) {
        if ((await db.rawQuery("SELECT ${sessionId} AS id"))[0].id !== this.session) throw Error("connection changed");
        await db.rawCommand("INSERT INTO entries VALUES (1)"); record("001:afterUp");
      }
      afterCommitUp() { record("001:afterCommitUp"); if (existsSync("fail-post")) throw Error("external failed"); }
    `,
    );
  });
  after(async () => {
    try {
      await client?.release();
      if (created)
        await admin.rawQuery(`DROP DATABASE ${admin.sql.escapeId(database)}`);
    } finally {
      await admin.release();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test(`${dialect}: dry and all generation modes skip hooks`, {
    timeout: 90_000,
  }, async () => {
    await run("migrate", "--dry", "--generateFiles");
    assert.equal(await hasTable("history"), false);
    assert.equal(await hasTable("entries"), false);
    for (const command of ["generate", "generate:test", "generate:er"])
      await run(command);
    assert.deepEqual(events(), []);
    assert.equal(await hasTable("history"), false);
  });

  test(`${dialect}: after hook sees created table; postcommit failure retains history and is not replayed`, {
    timeout: 60_000,
  }, async () => {
    writeFileSync(join(directory, "fail-post"), "");
    await assert.rejects(run(), (error: Error) =>
      /committed, but its afterCommit hook failed/.test(error.message),
    );
    assert.equal(await count("entries"), 1);
    assert.deepEqual(await history(), ["001_first.ts:up"]);
    assert.deepEqual(events(), [
      "001:beforeUp",
      "001:afterUp",
      "001:afterCommitUp",
    ]);
    rmSync(join(directory, "fail-post"));
    await run();
    await run("generate");
    await run("migrate", "--dry");
    assert.equal(events().length, 3);
  });

  test(`${dialect}: failed after hook rolls back DML, releases lock, and retries`, {
    timeout: 60_000,
  }, async () => {
    migration(
      "002_dml",
      `
      up(store) { store.sql("INSERT INTO entries VALUES (2)"); }
      down(store) { store.sql("DELETE FROM entries WHERE id = 2"); }
      async afterUp({db}) { await db.rawCommand("INSERT INTO entries VALUES (3)"); if (existsSync("fail-dml")) throw Error("DML hook failed"); }
    `,
    );
    writeFileSync(join(directory, "fail-dml"), "");
    await assert.rejects(run(), /DML hook failed/);
    assert.equal(await count("entries"), 1);
    assert.deepEqual(await history(), ["001_first.ts:up"]);
    rmSync(join(directory, "fail-dml"));
    await run();
    assert.equal(await count("entries"), 3);
    assert.deepEqual(await history(), ["001_first.ts:up", "002_dml.ts:up"]);
  });

  test(`${dialect}: DDL failure has documented rollback boundary; repair and retry, then down hooks`, {
    timeout: 90_000,
  }, async () => {
    migration(
      "003_ddl",
      `
      up(store) { store.sql("CREATE TABLE partial_table (id INT PRIMARY KEY)"); }
      down(store) { store.sql("DROP TABLE partial_table"); }
      afterUp() { if (existsSync("fail-ddl")) throw Error("DDL hook failed"); }
      async beforeDown({db}) { await db.rawQuery("SELECT * FROM partial_table"); record("003:beforeDown"); }
      async afterDown({db}) {
        const rows = await db.rawQuery("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_name = 'partial_table' AND ${postgres ? "table_schema = 'public'" : "table_schema = DATABASE()"}");
        if (Number(rows[0].n) !== 0) throw Error("afterDown ran before DROP"); record("003:afterDown");
      }
      afterCommitDown() { record("003:afterCommitDown"); }
    `,
    );
    writeFileSync(join(directory, "fail-ddl"), "");
    await assert.rejects(run(), /DDL hook failed/);
    assert.equal(await hasTable("partial_table"), !postgres);
    assert.equal((await history()).length, 2);
    if (!postgres) await client.rawQuery("DROP TABLE partial_table");
    rmSync(join(directory, "fail-ddl"));
    await run();
    assert.equal(await hasTable("partial_table"), true);
    configuration("002_dml.ts");
    await run();
    assert.equal(await hasTable("partial_table"), false);
    assert.deepEqual(events().slice(-3), [
      "003:beforeDown",
      "003:afterDown",
      "003:afterCommitDown",
    ]);
    assert.deepEqual((await history()).slice(-2), [
      "003_ddl.ts:up",
      "003_ddl.ts:down",
    ]);
    configuration();
    await run();
  });

  test(`${dialect}: concurrent processes cannot apply twice; lock is released after completion`, {
    timeout: 60_000,
  }, async () => {
    migration(
      "004_concurrent",
      `
      up(store) { store.sql("INSERT INTO entries VALUES (4)"); }
      down(store) { store.sql("DELETE FROM entries WHERE id = 4"); }
      async beforeUp() {
        record("004:beforeUp"); writeFileSync("ready", "");
        const deadline = Date.now() + 20000;
        while (!existsSync("proceed")) { if (Date.now() > deadline) throw Error("barrier timeout"); await delay(25); }
      }
    `,
    );
    await run("migrate", "--dry");
    const first = run("migrate", "--skipBuild");
    // Attach rejection handling before polling to avoid an unhandled child error.
    const completed = first.then(
      () => undefined,
      (error: Error) => error,
    );
    try {
      const deadline = Date.now() + 15_000;
      while (!existsSync(join(directory, "ready"))) {
        assert.ok(
          Date.now() < deadline,
          "first migration did not reach barrier",
        );
        await delay(25);
      }
      await assert.rejects(
        run("migrate", "--skipBuild"),
        /Another Sasat migration is running/,
      );
    } finally {
      writeFileSync(join(directory, "proceed"), "");
    }
    assert.equal(await completed, undefined);
    await run("migrate", "--skipBuild");
    assert.equal(
      events().filter((event) => event === "004:beforeUp").length,
      1,
    );
    assert.equal(
      (await history()).filter((row) => row === "004_concurrent.ts:up").length,
      1,
    );
    assert.equal(await count("entries"), 4);
  });

  test(`${dialect}: reusable client (PostgreSQL max=1) retains no session lock after failure`, {
    timeout: 15_000,
  }, async () => {
    await assert.rejects(
      withMigrationLock(client, async (db) => {
        const tx = await db.transaction();
        await tx.rawQuery("SELECT * FROM missing_table");
      }),
    );
    const other = makeClient(database);
    try {
      await withMigrationLock(other, async (db) => {
        const tx = await db.transaction();
        await tx.rawQuery("SELECT 1");
        await tx.commit();
      });
      await withMigrationLock(client, async (db) => {
        await db.rawQuery("SELECT 1");
      });
    } finally {
      await other.release();
    }
  });
}
