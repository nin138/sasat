import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

for (const format of ["esm", "cjs"] as const) {
  test(`configuration validates and rolls back invalid updates in ${format}`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sasat-config-package-"));
    try {
      writeFileSync(
        path.join(dir, "sasat.yml"),
        "db:\n  port: $S06_PORT\n  password: $S06_PASSWORD\ngenerator:\n  gql:\n    subscription: $S06_SUBSCRIPTIONS\n",
      );
      const entry = path.resolve(
        `dist/index.${format === "esm" ? "mjs" : "cjs"}`,
      );
      const load =
        format === "esm"
          ? `import * as sasat from ${JSON.stringify(pathToFileURL(entry).href)}; import assert from 'node:assert/strict';`
          : `const sasat = require(${JSON.stringify(entry)}); const assert = require('node:assert/strict');`;
      const result = spawnSync(
        process.execPath,
        [
          ...(format === "esm" ? ["--input-type=module"] : []),
          "-e",
          `${load}
        const before = sasat.setConfig({});
        assert.equal(before.db.port, 5432);
        assert.equal(before.db.password, 'S06_SYNTHETIC_SECRET');
        assert.equal(before.generator.gql.subscription, false);
        assert.throws(() => sasat.setConfig({db:{host:'changed',port:0}}), /db.port/);
        assert.deepEqual(sasat.setConfig({}), before);
        assert.equal(sasat.setConfig({}).db.host, '127.0.0.1');
        const after = sasat.setConfig({db:{database:'next',password:'$LITERAL'}});
        assert.equal(after.db.password, '$LITERAL');
        assert.equal(after.db.port,5432);
        assert.equal(before.db.database,'sasat');
        console.log('configuration validated');
      `,
        ],
        {
          cwd: dir,
          encoding: "utf8",
          env: {
            ...process.env,
            S06_PORT: "5432",
            S06_PASSWORD: "S06_SYNTHETIC_SECRET",
            S06_SUBSCRIPTIONS: "false",
          },
        },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim(), "configuration validated");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

for (const format of ["mjs", "cjs"]) {
  test(`CLI migration:build works without database environment in ${format}`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sasat-offline-build-"));
    try {
      mkdirSync(path.join(dir, "definitions"));
      writeFileSync(
        path.join(dir, "sasat.yml"),
        `db:
  host: $BUILD_DB_ABSENT
  port: $BUILD_DB_ABSENT
  user: $BUILD_DB_ABSENT
  database: $BUILD_DB_ABSENT
  password: $BUILD_DB_ABSENT
testDB: $BUILD_DB_ABSENT
generator: $BUILD_DB_ABSENT
migration:
  dir: $BUILD_MIGRATIONS_DIR
  target: $BUILD_MIGRATIONS_TARGET
  db: $BUILD_DB_ABSENT
`,
      );
      const migration = path.join(dir, "definitions/001.ts");
      writeFileSync(
        migration,
        'throw new Error("migration must not execute during compilation");\nexport default class Migration { value: number = 42; }',
      );
      const env = {
        ...process.env,
        BUILD_MIGRATIONS_DIR: "definitions",
        BUILD_MIGRATIONS_TARGET: "001.ts",
      };
      delete (env as NodeJS.ProcessEnv).BUILD_DB_ABSENT;
      const result = spawnSync(
        process.execPath,
        [path.resolve(`dist/cli/index.${format}`), "migration:build"],
        { cwd: dir, encoding: "utf8", env, timeout: 20000 },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Done!/);
      assert.ok(existsSync(path.join(dir, "definitions/001.mjs")));
      assert.match(
        readFileSync(path.join(dir, "definitions/001.mjs"), "utf8"),
        /value = 42/,
      );
      assert.ok(!existsSync(path.join(dir, "out")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

for (const [yaml, message] of [
  ["migration:\n  dir: $BUILD_ABSENT", /migration.dir/],
  [
    "migration:\n  dir: definitions\n  target: $BUILD_ABSENT",
    /migration.target/,
  ],
  [
    "migration:\n  dir: definitions\n  target: missing.ts",
    /migration target not found/,
  ],
  ["migration:\n  dir: []", /migration.dir/],
  ["db: [SYNTHETIC_BUILD_SECRET", /sasat.yml/],
] as const) {
  test(`CLI migration:build rejects invalid build settings (${message}) before writing`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sasat-invalid-build-"));
    try {
      mkdirSync(path.join(dir, "definitions"));
      writeFileSync(
        path.join(dir, "definitions/001.ts"),
        "export const value = 42;",
      );
      const output = path.join(dir, "definitions/001.mjs");
      writeFileSync(output, "previous output");
      writeFileSync(path.join(dir, "sasat.yml"), yaml);
      const env = { ...process.env };
      delete env.BUILD_ABSENT;
      const result = spawnSync(
        process.execPath,
        [path.resolve("dist/cli/index.mjs"), "migration:build"],
        { cwd: dir, encoding: "utf8", env, timeout: 20000 },
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.ok(!result.stderr.includes("SYNTHETIC_BUILD_SECRET"));
      assert.equal(readFileSync(output, "utf8"), "previous output");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

for (const command of ["generate", "migrate"]) {
  for (const malformed of [false, true]) {
    test(`CLI ${command} rejects ${malformed ? "malformed YAML" : "missing environment values"} without output changes or secret disclosure`, () => {
      const dir = mkdtempSync(path.join(tmpdir(), "sasat-config-cli-"));
      try {
        const sentinel = path.join(dir, "out", "__generated__", "keep.txt");
        mkdirSync(path.dirname(sentinel), { recursive: true });
        writeFileSync(sentinel, "preserve");
        writeFileSync(
          path.join(dir, "sasat.yml"),
          malformed
            ? "db: [S06_SYNTHETIC_SECRET"
            : "db:\n  port: $S06_ABSENT\n  password: S06_SYNTHETIC_SECRET\nmigration:\n  out: out\n",
        );
        const env = { ...process.env };
        delete env.S06_ABSENT;
        const result = spawnSync(
          process.execPath,
          [path.resolve("dist/cli/index.mjs"), command],
          { cwd: dir, encoding: "utf8", env },
        );
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Invalid configuration:/);
        assert.match(result.stderr, malformed ? /sasat.yml/ : /db.port/);
        assert.ok(!result.stderr.includes("S06_SYNTHETIC_SECRET"));
        assert.ok(!result.stdout.includes("S06_SYNTHETIC_SECRET"));
        assert.equal(readFileSync(sentinel, "utf8"), "preserve");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
}
