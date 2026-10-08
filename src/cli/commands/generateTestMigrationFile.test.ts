import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../../config/config.js";
import type { DBClient } from "../../db/connectors/dbClient.js";
import { MigrationController } from "../../migration/controller.js";
import { Direction } from "../../migration/exec/getCurrentMigration.js";
import { compileMigrationFiles } from "../../migration/exec/migrationFileCompiler.js";
import { StoreMigrator } from "../../migration/front/storeMigrator.js";
import {
  generateTestMigrationFile,
  renderTestMigrationFile,
} from "./generateTestMigrationFile.js";

jest.mock("../../migration/exec/migrationFileCompiler.js", () => ({
  compileMigrationFiles: jest.fn().mockResolvedValue([]),
}));

test("collects migration SQL while respecting skipOnTest", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sasat-test-sql-"));
  const original = config().migration.dir;
  config().migration.dir = dir;
  try {
    jest
      .spyOn(MigrationController.prototype, "migrate")
      .mockImplementation(async (client, _current, options, execute) => {
        const store = StoreMigrator.deserialize({ tables: [] });
        store.sql("CREATE TABLE users(id int)");
        await execute!(client, store, "001.ts", Direction.Up, options);
        store.resetQueue();
        store.currentOption.skipOnTest = true;
        store.sql("INSERT INTO production_only VALUES (1)");
        await execute!(client, store, "002.ts", Direction.Up, options);
        return { store: store.serialize(), currentMigration: "002.ts" };
      });
    await generateTestMigrationFile({} as DBClient);
    expect(compileMigrationFiles).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(readFileSync(join(dir, "test.migration.json"), "utf8")),
    ).toEqual(["CREATE TABLE users(id int)"]);
  } finally {
    config().migration.dir = original;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("renders test SQL from already compiled definitions without writing a file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sasat-test-sql-"));
  const original = config().migration.dir;
  config().migration.dir = dir;
  try {
    jest
      .spyOn(MigrationController.prototype, "migrate")
      .mockResolvedValue({ store: { tables: [] }, currentMigration: "001.ts" });
    await expect(renderTestMigrationFile({} as DBClient, true)).resolves.toBe(
      "[]",
    );
    expect(compileMigrationFiles).not.toHaveBeenCalled();
    expect(existsSync(join(dir, "test.migration.json"))).toBe(false);
  } finally {
    config().migration.dir = original;
    rmSync(dir, { recursive: true, force: true });
  }
});
