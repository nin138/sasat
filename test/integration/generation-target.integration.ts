import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);
for (const command of ["generate", "generate:er", "generate:test"]) {
  test(`${command} rejects an unknown target without changing existing artifacts`, async () => {
    const directory = mkdtempSync(join(tmpdir(), "sasat-invalid-target-"));
    const artifacts = [
      "migrations/currentSchema.yml",
      "migrations/test.migration.json",
      "out/__generated__/resolver.ts",
      "out/__generated__/er-diagram.mermaid",
    ];
    try {
      for (const file of artifacts) {
        mkdirSync(join(directory, file, ".."), { recursive: true });
        writeFileSync(join(directory, file), "keep existing artifact\n");
      }
      writeFileSync(
        join(directory, "migrations/001.ts"),
        "invalid TypeScript proves validation precedes compilation",
      );
      writeFileSync(
        join(directory, "sasat.yml"),
        JSON.stringify({
          migration: { dir: "migrations", out: "out", target: "missing.ts" },
        }),
      );
      await assert.rejects(
        execute(
          process.execPath,
          [
            resolve("node_modules/tsx/dist/cli.mjs"),
            "--tsconfig",
            resolve("tsconfig.json"),
            resolve("src/cli/index.ts"),
            command,
          ],
          { cwd: directory, timeout: 20000 },
        ),
        (error: unknown) => {
          const result = error as {
            code: number;
            stdout: string;
            stderr: string;
          };
          assert.notEqual(result.code, 0);
          assert.match(
            result.stdout + result.stderr,
            /migration target not found/,
          );
          return true;
        },
      );
      for (const file of artifacts)
        assert.equal(
          readFileSync(join(directory, file), "utf8"),
          "keep existing artifact\n",
        );
      assert.equal(existsSync(join(directory, "migrations/001.mjs")), false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
