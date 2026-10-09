import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../../config/config.js";
import { createSqlGenerator } from "../../db/sqlGenerator.js";
import { getMigrationFileNames } from "../../migration/exec/getMigrationFiles.js";
import { compileMigrationFiles } from "../../migration/exec/migrationFileCompiler.js";
import { readMigration } from "../../migration/exec/readMigrationFile.js";
import {
  generateTestMigrationFile,
  renderTestMigrationFile,
} from "./generateTestMigrationFile.js";

jest.mock("../../migration/exec/migrationFileCompiler.js", () => ({
  compileMigrationFiles: jest.fn().mockResolvedValue([]),
}));
jest.mock("../../migration/exec/getMigrationFiles.js", () => ({
  getMigrationFileNames: jest.fn(),
}));
jest.mock("../../migration/exec/readMigrationFile.js", () => ({
  readMigration: jest.fn(),
}));

test.each(["mysql", "postgres"] as const)(
  "%s: collects SQL up to the target while respecting skipOnTest",
  async (dialect) => {
    const dir = mkdtempSync(join(tmpdir(), "sasat-test-sql-"));
    const original = { ...config().migration };
    config().migration.dir = dir;
    config().migration.target = "003.ts";
    const sql = createSqlGenerator(dialect);
    jest
      .mocked(getMigrationFileNames)
      .mockReturnValue(["001.ts", "002.ts", "003.ts", "004.ts"]);
    jest.mocked(readMigration).mockImplementation(async (store, name) => {
      expect(store.sqlGenerator.dialect).toBe(dialect);
      store.currentOption.skipOnTest = name === "002.ts";
      store.sql(
        name === "001.ts"
          ? "CREATE TABLE users(id int)"
          : "INSERT INTO users VALUES (1)",
      );
      return store;
    });
    try {
      await generateTestMigrationFile(sql);
      expect(compileMigrationFiles).toHaveBeenCalledTimes(1);
      expect(readMigration).toHaveBeenCalledTimes(3);
      expect(
        JSON.parse(readFileSync(join(dir, "test.migration.json"), "utf8")),
      ).toEqual(["CREATE TABLE users(id int)", "INSERT INTO users VALUES (1)"]);
    } finally {
      config().migration = original;
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

test("renders already compiled empty definitions without writing a file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sasat-test-sql-"));
  const original = { ...config().migration };
  config().migration.dir = dir;
  config().migration.target = undefined;
  jest.mocked(getMigrationFileNames).mockReturnValue([]);
  try {
    await expect(
      renderTestMigrationFile(createSqlGenerator("mysql"), true),
    ).resolves.toBe("[]");
    expect(compileMigrationFiles).not.toHaveBeenCalled();
    expect(existsSync(join(dir, "test.migration.json"))).toBe(false);
  } finally {
    config().migration = original;
    rmSync(dir, { recursive: true, force: true });
  }
});
