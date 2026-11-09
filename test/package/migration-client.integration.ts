import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateDbClient } from "../../src/generatorv2/codegen/ts/generateDbClient.js";
import { standaloneFixture } from "./standalone-fixture.js";

for (const dialect of ["mysql", "postgres"] as const) {
  test(`migrate ${dialect} uses the user client for apply, dry and skipBuild`, () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "sasat-migrate client #-"),
    );
    try {
      standaloneFixture(directory, dialect);
      const output = dialect === "mysql" ? "sasat" : "custom output";
      const clientDir = path.join(directory, output);
      mkdirSync(path.join(clientDir, "__generated__"), { recursive: true });
      writeFileSync(
        path.join(clientDir, "__generated__/dbClient.ts"),
        generateDbClient(dialect),
      );
      writeFileSync(
        path.join(clientDir, "options.ts"),
        `export const options = ${dialect === "mysql" ? "{ connectionLimit: 1 }" : "{ max: 1 }"};`,
      );
      const clientFile = path.join(clientDir, "dbClient.ts");
      writeFileSync(
        clientFile,
        `
import "server-only";
import { appendFileSync, existsSync } from "node:fs";
import { getDbConfig } from "sasat";
import { getDbClient as generated } from "./__generated__/dbClient.js";
import { options } from "./options";
if (getDbConfig().database !== "migration_database") throw Error("runtime override missing");
const event = (name: string) => appendFileSync("events", name + "\\n");
event("loaded");
export async function getDbClient() {
  const runtime = await import("sasat");
  if (runtime.getDbConfig().database !== "migration_database") throw Error("dynamic import config missing");
  require.resolve("sasat");
  event("getDbClient");
  const client = generated(options, () => event("query"));
  client.execSql = async (sql: string) => {
    if (existsSync("fail-query")) throw Error("custom query failed");
    if (sql.includes(" AS acquired")) return [{ acquired: 1 }];
    if (sql.includes(" AS released")) return [{ released: 1 }];
    return [];
  };
  client.transaction = async () => {
    event("transaction");
    return {
      sql: client.sql,
      rawQuery: client.rawQuery.bind(client),
      rawCommand: client.rawCommand.bind(client),
      rollback: async () => event("rollback"),
      discard: async () => event("discard"),
    };
  };
  const release = client.release.bind(client);
  client.release = async () => { await release(); event("released"); };
  return client;
}
`,
      );
      const source = readFileSync(clientFile, "utf8");
      const configFile = path.join(directory, "sasat.yml");
      const config = {
        db: { dialect, database: "application_database" },
        migration: {
          ...(dialect === "postgres" ? { out: output } : {}),
          db: { database: "migration_database" },
        },
      };
      writeFileSync(configFile, JSON.stringify(config));
      const run = (...args: string[]) =>
        spawnSync(
          process.execPath,
          [
            "node_modules/sasat/dist/cli/index.mjs",
            "migrate",
            "--silent",
            ...args,
          ],
          {
            cwd: directory,
            encoding: "utf8",
            timeout: 15000,
            env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
          },
        );
      const events = path.join(directory, "events");
      for (const args of [
        [],
        ["--dry"],
        ["--skipBuild"],
        ["--dry", "--skipBuild"],
      ]) {
        const result = run(...args);
        assert.equal(result.status, 0, result.stderr);
        const recorded = readFileSync(events, "utf8");
        assert.match(recorded, /^loaded\ngetDbClient\n/);
        assert.match(recorded, /query\n/);
        assert.match(recorded, /released\n$/);
        assert.equal(
          recorded.includes("transaction\n"),
          !args.includes("--dry"),
        );
        rmSync(events);
      }
      for (const args of [[], ["--dry"]]) {
        writeFileSync(path.join(directory, "fail-query"), "");
        const failed = run(...args);
        assert.notEqual(failed.status, 0);
        assert.match(failed.stderr, /custom query failed/);
        assert.match(readFileSync(events, "utf8"), /released\n$/);
        rmSync(events);
        rmSync(path.join(directory, "fail-query"));
      }
      assert.equal(readFileSync(clientFile, "utf8"), source);
      assert.deepEqual(readdirSync(clientDir).sort(), [
        "__generated__",
        "dbClient.ts",
        "options.ts",
      ]);
      writeFileSync(
        configFile,
        JSON.stringify({
          ...config,
          migration: { ...config.migration, target: "missing.ts" },
        }),
      );
      assert.match(run().stderr, /migration target not found/);
      assert.ok(!existsSync(events));
      writeFileSync(configFile, JSON.stringify(config));
      writeFileSync(clientFile, "export const getDbClient = !!!;");
      assert.notEqual(run().status, 0);
      assert.ok(!existsSync(events));
      writeFileSync(clientFile, "export const other = 1;");
      assert.match(run().stderr, /must export getDbClient/);
      // Each invocation recompiles the user's edits instead of using a stale cache.
      writeFileSync(
        clientFile,
        source.replace('event("getDbClient")', 'event("edited")'),
      );
      assert.equal(run("--dry").status, 0);
      assert.match(readFileSync(events, "utf8"), /^loaded\nedited\n/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
