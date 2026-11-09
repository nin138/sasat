import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
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
  test(`standalone ${dialect} embeds the user client and initializes it after runtime configuration`, () => {
    const source = mkdtempSync(path.join(tmpdir(), "sasat-custom-client-"));
    const deploy = mkdtempSync(path.join(tmpdir(), "sasat-client deploy #-"));
    try {
      const build = standaloneFixture(source, dialect);
      const output = dialect === "mysql" ? "sasat" : "custom output";
      const configFile = path.join(source, "sasat.yml");
      const buildConfig = JSON.parse(readFileSync(configFile, "utf8"));
      if (dialect === "postgres") buildConfig.migration.out = output;
      writeFileSync(configFile, JSON.stringify(buildConfig));
      mkdirSync(path.join(source, output, "__generated__"), {
        recursive: true,
      });
      writeFileSync(
        path.join(source, output, "__generated__/dbClient.ts"),
        generateDbClient(dialect),
      );
      const customClient = path.join(source, output, "dbClient.ts");
      writeFileSync(
        customClient,
        `
import "server-only";
import { appendFileSync, existsSync } from "node:fs";
import { getDbConfig } from "sasat";
import { getDbClient as getGeneratedDbClient } from "./__generated__/dbClient.js";
// Reading config at import time must see the deployment override, not build settings.
if (getDbConfig().database !== "deployment_override") throw Error("client loaded before runtime config");
appendFileSync("client-events", "loaded\\n");
export function getDbClient() {
  appendFileSync("client-events", "getDbClient\\n");
  const client = getGeneratedDbClient(
    ${dialect === "mysql" ? "{ connectionLimit: 1 }" : "{ max: 1 }"},
    () => appendFileSync("client-events", "query\\n"),
  );
  // Exercise the real generated provider and logger without opening a database connection.
  client.execSql = async () => {
    if (existsSync("fail-query")) throw Error("custom query failed");
    return [];
  };
  const release = client.release.bind(client);
  client.release = async () => {
    await release();
    appendFileSync("client-events", "released\\n");
  };
  return client;
}
`,
      );
      writeFileSync(
        path.join(source, "migrations/001.ts"),
        "export default class { up() {} down() {} }",
      );
      const built = build();
      assert.equal(built.status, 0, built.stderr);
      assert.ok(!existsSync(path.join(source, "client-events")));
      const artifact = path.join(source, "migration.cjs");
      const content = readFileSync(artifact, "utf8");
      assert.ok(!content.includes("BUILD_SECRET_MUST_NOT_BE_EMBEDDED"));
      // A broken customization must fail the build instead of silently falling back.
      writeFileSync(customClient, "export const getDbClient = !!!;");
      assert.notEqual(build().status, 0);
      assert.equal(readFileSync(artifact, "utf8"), content);
      copyFileSync(artifact, path.join(deploy, "migration.cjs"));
      rmSync(source, { recursive: true, force: true });
      const run = (...args: string[]) =>
        spawnSync(process.execPath, ["migration.cjs", ...args], {
          cwd: deploy,
          encoding: "utf8",
          timeout: 15000,
          env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
        });
      assert.equal(run("--help").status, 0);
      assert.equal(run("--list").stdout.trim(), "001.ts");
      assert.match(run().stderr, /configuration file not found/);
      const events = path.join(deploy, "client-events");
      assert.ok(!existsSync(events));
      writeFileSync(
        path.join(deploy, "runtime.yml"),
        JSON.stringify({
          db: { dialect, database: "application_database" },
          migration: { db: { database: "deployment_override" } },
        }),
      );
      assert.match(
        run("--config", "runtime.yml", "--target", "unknown.ts").stderr,
        /migration target not found/,
      );
      assert.ok(!existsSync(events));
      const result = run("--config", "runtime.yml", "--dry", "--silent");
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        readFileSync(events, "utf8"),
        "loaded\ngetDbClient\nquery\nreleased\n",
      );
      rmSync(events);
      writeFileSync(path.join(deploy, "fail-query"), "");
      const failed = run("--config", "runtime.yml", "--dry", "--silent");
      assert.notEqual(failed.status, 0);
      assert.match(failed.stderr, /custom query failed/);
      assert.equal(
        readFileSync(events, "utf8"),
        "loaded\ngetDbClient\nquery\nreleased\n",
      );
      assert.ok(!existsSync(path.join(deploy, "node_modules")));
    } finally {
      rmSync(source, { recursive: true, force: true });
      rmSync(deploy, { recursive: true, force: true });
    }
  });

  test(`standalone ${dialect} builds offline and moves without source or node_modules`, () => {
    const source = mkdtempSync(path.join(tmpdir(), "sasat-standalone-build-"));
    const deploy = mkdtempSync(
      path.join(tmpdir(), "sasat-standalone deploy #%-"),
    );
    try {
      const build = standaloneFixture(source, dialect);
      writeFileSync(
        path.join(source, "migrations/001.ts"),
        `
import "server-only";
import { Queries } from "sasat/migration";
throw Error("definitions must not execute during build, list, help or validation");
export default class Migration { up(store) { store.sql(Queries ? "SELECT 1" : "SELECT 2"); } }
`,
      );
      const built = build("--out", "migration.cjs");
      assert.equal(built.status, 0, built.stderr);
      assert.deepEqual(readdirSync(path.join(source, "migrations")), [
        "001.ts",
      ]);
      const artifact = path.join(source, "migration.cjs");
      const content = readFileSync(artifact, "utf8");
      assert.ok(!content.includes("BUILD_SECRET_MUST_NOT_BE_EMBEDDED"));
      assert.ok(!content.includes("esbuild/lib/main"));
      // Build errors must preserve the previously published executable.
      writeFileSync(
        path.join(source, "migrations/002.ts"),
        "export default class { !!! }",
      );
      assert.notEqual(build().status, 0);
      assert.equal(readFileSync(artifact, "utf8"), content);
      rmSync(path.join(source, "migrations/002.ts"));
      assert.notEqual(build("--out", "migration.js").status, 0);
      copyFileSync(artifact, path.join(deploy, "migration.cjs"));
      rmSync(source, { recursive: true, force: true });
      const run = (...args: string[]) =>
        spawnSync(
          process.execPath,
          [path.join(deploy, "migration.cjs"), ...args],
          {
            cwd: deploy,
            encoding: "utf8",
            timeout: 15000,
            env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
          },
        );
      assert.equal(run("--help").status, 0);
      assert.equal(run("--list").stdout.trim(), "001.ts");
      assert.match(run().stderr, /configuration file not found/);
      writeFileSync(
        path.join(deploy, "sasat.yml"),
        JSON.stringify({ db: { dialect } }),
      );
      assert.match(
        run("--target", "unknown.ts").stderr,
        /migration target not found/,
      );
      assert.notEqual(run("--unknown").status, 0);
      writeFileSync(
        path.join(deploy, "sasat.yml"),
        JSON.stringify({
          db: { dialect: dialect === "mysql" ? "postgres" : "mysql" },
        }),
      );
      assert.match(run().stderr, /dialect does not match/);
      assert.deepEqual(readdirSync(deploy).sort(), [
        "migration.cjs",
        "sasat.yml",
      ]);
      assert.ok(!existsSync(path.join(deploy, "node_modules")));
    } finally {
      rmSync(source, { recursive: true, force: true });
      rmSync(deploy, { recursive: true, force: true });
    }
  });
}
