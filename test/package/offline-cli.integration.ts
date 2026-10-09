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
import { join, resolve } from "node:path";
import { test } from "node:test";

for (const format of ["mjs", "cjs"]) {
  test(`CLI setup needs no connection configuration (${format})`, () => {
    const dir = mkdtempSync(join(tmpdir(), "sasat-cli-setup-"));
    const cli = resolve(`dist/cli/index.${format}`);
    const run = (...args: string[]) =>
      spawnSync(process.execPath, [cli, ...args], {
        cwd: dir,
        encoding: "utf8",
        timeout: 20000,
      });
    try {
      assert.equal(run().status, 0);
      assert.equal(run("init").status, 0);
      assert.ok(existsSync(join(dir, "sasat.yml")));
      const yaml =
        "db: $CLI_UNUSED_ABSENT\ngenerator: $CLI_UNUSED_ABSENT\nmigration:\n  dir: definitions\n  target: $CLI_UNUSED_ABSENT\n  out: $CLI_UNUSED_ABSENT\n";
      writeFileSync(join(dir, "sasat.yml"), yaml);
      assert.equal(run("init").status, 0);
      assert.equal(readFileSync(join(dir, "sasat.yml"), "utf8"), yaml);
      const result = run("migration:create", "createUser");
      assert.equal(result.status, 0, result.stderr);
      assert.match(readdirSync(join(dir, "definitions"))[0], /createUser.ts$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const dialect of ["mysql", "postgres"]) {
    test(`CLI generation is offline and honors ${dialect} dialect (${format})`, () => {
      const dir = mkdtempSync(join(tmpdir(), "sasat-cli-offline-"));
      const env = { ...process.env };
      delete env.CLI_UNUSED_ABSENT;
      const run = (command: string) =>
        spawnSync(
          process.execPath,
          [resolve(`dist/cli/index.${format}`), command],
          { cwd: dir, encoding: "utf8", env, timeout: 20000 },
        );
      const config = (
        output = "output",
        generator: unknown = { addJsExtToImportStatement: true },
      ) =>
        writeFileSync(
          join(dir, "sasat.yml"),
          JSON.stringify({
            db: {
              dialect: "mysql",
              host: "$CLI_UNUSED_ABSENT",
              port: "$CLI_UNUSED_ABSENT",
              password: "$CLI_UNUSED_ABSENT",
            },
            testDB: "$CLI_UNUSED_ABSENT",
            migration: {
              dir: "definitions",
              target: "002.ts",
              out: output,
              db: { dialect, host: "$CLI_UNUSED_ABSENT" },
            },
            generator,
          }),
        );
      const successful = (command: string) => {
        const result = run(command);
        assert.equal(result.status, 0, result.stderr);
      };
      try {
        mkdirSync(join(dir, "definitions"));
        writeFileSync(
          join(dir, "definitions/001.ts"),
          `
export default class Migration {
  up(store) { store.createTable("users", t => { t.column("id").int().primary(); }); }
  beforeUp() { throw Error("apply hook must not run"); }
  afterUp() { throw Error("apply hook must not run"); }
  afterCommitUp() { throw Error("apply hook must not run"); }
}
`,
        );
        writeFileSync(
          join(dir, "definitions/002.ts"),
          `
export default class Migration {
  skipOnTest = true;
  up(store) { store.sql("INSERT INTO users VALUES (42)"); }
}
`,
        );
        writeFileSync(
          join(dir, "definitions/003.ts"),
          'export default class Migration { up() { throw Error("beyond target"); } }',
        );
        config("output", "$CLI_UNUSED_ABSENT");
        successful("generate:er");
        assert.match(
          readFileSync(
            join(dir, "output/__generated__/er-diagram.mermaid"),
            "utf8",
          ),
          /users/,
        );
        config("$CLI_UNUSED_ABSENT", "$CLI_UNUSED_ABSENT");
        successful("generate:test");
        const sql = JSON.parse(
          readFileSync(join(dir, "definitions/test.migration.json"), "utf8"),
        ) as string[];
        assert.equal(sql.length, 1);
        assert.ok(
          sql[0].includes(dialect === "mysql" ? "`users`" : '"users"'),
          sql[0],
        );
        config();
        successful("generate");
        assert.ok(existsSync(join(dir, "definitions/currentSchema.yml")));
        assert.match(
          readFileSync(join(dir, "output/__generated__/dbClient.ts"), "utf8"),
          new RegExp(`sasat/${dialect}`),
        );
        // A later invalid setting must leave already published code intact.
        const generated = join(dir, "output/__generated__/dbClient.ts");
        const before = readFileSync(generated, "utf8");
        config("output", { gql: { subscription: "invalid" } });
        const failed = run("generate");
        assert.notEqual(failed.status, 0);
        assert.match(failed.stderr, /generator.gql.subscription/);
        assert.equal(readFileSync(generated, "utf8"), before);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
}
