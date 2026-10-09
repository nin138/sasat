import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { standaloneFixture } from "./standalone-fixture.js";

for (const dialect of ["mysql", "postgres"] as const) {
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
