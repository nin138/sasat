import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../../config/config.js";
import {
  changeExtTsToJs,
  compileMigrationFiles,
} from "./migrationFileCompiler.js";

test("compiles TypeScript migrations into executable ESM and stubs server-only", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sasat-compile-"));
  const previousDir = config().migration.dir;
  jest.spyOn(process, "cwd").mockReturnValue(dir);
  config().migration.dir = ".";
  try {
    writeFileSync(
      join(dir, "001.ts"),
      'import "server-only"; export default class Migration { value: number = 42; }',
    );
    expect(changeExtTsToJs("001.ts")).toBe("001.mjs");
    await expect(compileMigrationFiles()).resolves.toEqual(["001.ts"]);
    expect(existsSync(join(dir, "001.mjs"))).toBe(true);
    const result = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'const {default: Migration} = await import("./001.mjs"); console.log(new Migration().value);',
      ],
      { cwd: dir, encoding: "utf8" },
    );
    expect(result.trim()).toBe("42");
  } finally {
    config().migration.dir = previousDir;
    rmSync(dir, { recursive: true, force: true });
  }
});
