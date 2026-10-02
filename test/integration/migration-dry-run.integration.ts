import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import {
  type Connection,
  createConnection,
  type RowDataPacket,
} from "mysql2/promise";

const execute = promisify(execFile);
const tsx = resolve("node_modules/tsx/dist/cli.mjs");
const cli = resolve("src/cli/index.ts");
const tsconfig = resolve("tsconfig.json");
const directory = mkdtempSync(join(tmpdir(), "sasat-dry-run-"));
const database = `sasat_it_${randomUUID().replaceAll("-", "")}`;
const options = {
  host: process.env.TEST_DB_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT ?? 3308),
  user: process.env.TEST_DB_USER ?? "root",
  password: process.env.TEST_DB_PASSWORD ?? "",
  connectTimeout: 5_000,
};
let connection: Connection | undefined;
let created = false;

before(async () => {
  connection = await createConnection(options);
  await connection.query("CREATE DATABASE ??", [database]);
  created = true;
  await connection.query("USE ??", [database]);
  // Keep credentials in child-process environment variables, not fixture files.
  writeFileSync(
    join(directory, "sasat.yml"),
    JSON.stringify({
      db: {
        host: "$REVIEW_DB_HOST",
        port: "$REVIEW_DB_PORT",
        user: "$REVIEW_DB_USER",
        password: "$REVIEW_DB_PASSWORD",
        database,
      },
      migration: { dir: ".", out: "generated", table: "history" },
    }),
  );
  migration("001_first", "first_table");
  migration("002_second", "second_table");
});
after(async () => {
  try {
    if (connection) {
      try {
        if (created) await connection.query("DROP DATABASE ??", [database]);
      } finally {
        await connection.end();
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function migration(name: string, table: string) {
  writeFileSync(
    join(directory, name + ".ts"),
    `export default class Migration {
    up(store) { store.sql("CREATE TABLE ${table} (id INT PRIMARY KEY)"); }
    down(store) { store.sql("DROP TABLE ${table}"); }
  }`,
  );
}
async function runCli(...flags: string[]) {
  return execute(
    process.execPath,
    [tsx, "--tsconfig", tsconfig, cli, "migrate", ...flags],
    {
      cwd: directory,
      timeout: 20_000,
      env: {
        ...process.env,
        REVIEW_DB_HOST: options.host,
        REVIEW_DB_PORT: String(options.port),
        REVIEW_DB_USER: options.user,
        REVIEW_DB_PASSWORD: options.password,
      },
    },
  );
}
async function tables() {
  const [rows] = await connection!.query<RowDataPacket[]>("SHOW TABLES");
  return rows.map((row) => String(Object.values(row)[0])).sort();
}
function assertNoGeneratedArtifacts() {
  for (const name of [
    "generated",
    "currentSchema.yml",
    "test.migration.json",
  ]) {
    assert.equal(
      existsSync(join(directory, name)),
      false,
      name + " must not be generated during dry run",
    );
  }
}

test("CLI dry run with --generateFiles leaves a fresh database and generated artifacts unchanged", {
  timeout: 45_000,
}, async () => {
  for (const flags of [
    ["--dry", "--generateFiles"],
    ["--dry", "--generateFiles", "--skipBuild"],
  ]) {
    const { stdout } = await runCli(...flags);
    assert.match(stdout, /CREATE TABLE first_table/);
    assert.match(stdout, /dry run target is 002_second.ts/);
    assert.deepEqual(await tables(), []);
    assertNoGeneratedArtifacts();
  }
});

test("normal CLI migration still creates history and applies pending SQL", {
  timeout: 25_000,
}, async () => {
  await runCli();
  assert.deepEqual(await tables(), ["first_table", "history", "second_table"]);
  const [rows] = await connection!.query<RowDataPacket[]>(
    "SELECT name FROM history ORDER BY id",
  );
  assert.deepEqual(
    rows.map((row) => row.name),
    ["001_first.ts", "002_second.ts"],
  );
});

test("CLI dry run reads existing history without applying a pending migration", {
  timeout: 25_000,
}, async () => {
  migration("003_pending", "pending_table");
  const { stdout } = await runCli("--dry", "--generateFiles");
  assert.match(stdout, /CREATE TABLE pending_table/);
  assert.deepEqual(await tables(), ["first_table", "history", "second_table"]);
  const [rows] = await connection!.query<RowDataPacket[]>(
    "SELECT name FROM history ORDER BY id",
  );
  assert.deepEqual(
    rows.map((row) => row.name),
    ["001_first.ts", "002_second.ts"],
  );
  assertNoGeneratedArtifacts();
});
