import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../config/config.js";
import { readTestMigration } from "./readTestMigration.js";

test("reads precompiled test SQL without opening a connection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sasat-test-migration-"));
  const original = config().migration.dir;
  config().migration.dir = dir;
  try {
    writeFileSync(
      join(dir, "test.migration.json"),
      JSON.stringify(["SELECT 1", "SELECT 2"]),
    );
    await expect(readTestMigration()).resolves.toEqual([
      "SELECT 1",
      "SELECT 2",
    ]);
    writeFileSync(join(dir, "test.migration.json"), "{bad");
    await expect(readTestMigration()).rejects.toThrow();
  } finally {
    config().migration.dir = original;
    rmSync(dir, { recursive: true, force: true });
  }
});
