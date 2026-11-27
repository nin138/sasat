import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { standaloneFixture } from "./standalone-fixture.js";

for (const format of ["mjs", "cjs"]) {
  for (const scenario of [
    "plain",
    "absolute",
    "directory",
    "filename",
    "ignored",
  ]) {
    test(`migration ${format} loads ${scenario} paths during apply preview, skipBuild and history replay`, () => {
      const directory = mkdtempSync(path.join(tmpdir(), "sasat-paths-"));
      try {
        standaloneFixture(directory, "mysql");
        const relative =
          scenario === "directory" ? "migrations #?% space" : "migrations";
        const migrations = path.join(directory, relative);
        mkdirSync(migrations, { recursive: true });
        const name = scenario === "filename" ? "001 #?%.ts" : "001.ts";
        writeFileSync(
          path.join(migrations, name),
          `
import { appendFileSync } from "node:fs";
export default class Migration {
  up() { appendFileSync("read-events", "up\\n"); }
  down() {}
}`,
        );
        if (scenario === "ignored") {
          writeFileSync(
            path.join(migrations, "types.d.ts"),
            "export interface Data { id: number }",
          );
          mkdirSync(path.join(migrations, "helpers.ts"));
        }
        mkdirSync(path.join(directory, "custom"));
        writeFileSync(
          path.join(directory, "custom/dbClient.ts"),
          `
import { existsSync } from "node:fs";
export function getDbClient() {
  return {
    dialect: "mysql",
    async rawQuery() { return existsSync("history") ? [{ name: ${JSON.stringify(name)}, direction: "up" }] : []; },
    async release() {},
  };
}`,
        );
        writeFileSync(
          path.join(directory, "sasat.yml"),
          JSON.stringify({
            migration: {
              dir: scenario === "absolute" ? migrations : relative,
              out: "custom",
            },
          }),
        );
        const run = (...args: string[]) =>
          spawnSync(
            process.execPath,
            [
              `node_modules/sasat/dist/cli/index.${format}`,
              "migrate",
              "--dry",
              "--silent",
              ...args,
            ],
            { cwd: directory, encoding: "utf8", timeout: 15000 },
          );
        for (const args of [[], ["--skipBuild"]]) {
          const result = run(...args);
          assert.equal(result.status, 0, result.stderr);
        }
        writeFileSync(path.join(directory, "history"), "");
        const replay = run("--skipBuild");
        assert.equal(replay.status, 0, replay.stderr);
        assert.equal(
          readFileSync(path.join(directory, "read-events"), "utf8"),
          "up\nup\nup\n",
        );
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  }
}

for (const dialect of ["mysql", "postgres"] as const) {
  test(`standalone ${dialect} discovers executable migrations in an absolute special path`, () => {
    const directory = mkdtempSync(path.join(tmpdir(), "sasat-discover-"));
    try {
      const build = standaloneFixture(directory, dialect);
      const migrations = path.join(directory, "migrations #?% space");
      mkdirSync(migrations);
      writeFileSync(
        path.join(migrations, "001 #%.ts"),
        "export default class Migration { up() {} down() {} }",
      );
      writeFileSync(
        path.join(migrations, "types.d.ts"),
        "export interface Data { id: number }",
      );
      mkdirSync(path.join(migrations, "helpers.ts"));
      writeFileSync(
        path.join(directory, "sasat.yml"),
        JSON.stringify({
          db: { dialect },
          migration: { dir: migrations },
        }),
      );
      const result = build();
      assert.equal(result.status, 0, result.stderr);
      const list = spawnSync(process.execPath, ["migration.cjs", "--list"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 15000,
      });
      assert.equal(list.status, 0, list.stderr);
      assert.equal(list.stdout.trim(), "001 #%.ts");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
