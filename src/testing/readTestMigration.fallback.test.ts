import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateTestMigrationFile } from "../cli/commands/generateTestMigrationFile.js";
import { config } from "../config/config.js";
import { MysqlClient } from "../db/connectors/mysql/client.js";
import { PostgresClient } from "../db/connectors/postgres/client.js";
import { readTestMigration } from "./readTestMigration.js";

jest.mock("../cli/commands/generateTestMigrationFile.js", () => ({
  generateTestMigrationFile: jest.fn(),
}));
jest.mock("../db/connectors/mysql/client.js", () => ({
  MysqlClient: jest.fn(),
}));
jest.mock("../db/connectors/postgres/client.js", () => ({
  PostgresClient: jest.fn(),
}));
let directory: string;
let original: ReturnType<typeof config>;
const release = jest.fn();
beforeEach(() => {
  original = structuredClone(config());
  directory = mkdtempSync(join(tmpdir(), "sasat-missing-test-migration-"));
  config().migration.dir = directory;
  config().migration.db = undefined;
  release.mockReset().mockResolvedValue(undefined);
  jest.mocked(MysqlClient).mockImplementation(() => ({ release }) as never);
  jest.mocked(PostgresClient).mockImplementation(() => ({ release }) as never);
  jest.mocked(generateTestMigrationFile).mockImplementation(async () => {
    writeFileSync(join(directory, "test.migration.json"), '["SELECT 1"]');
  });
});
afterEach(() => {
  Object.assign(config(), original);
  rmSync(directory, { recursive: true, force: true });
});

test.each(["mysql", "postgres"] as const)(
  "generates missing test SQL using %s and releases the client",
  async (dialect) => {
    config().db.dialect = dialect;
    const Client = dialect === "mysql" ? MysqlClient : PostgresClient;
    const Other = dialect === "mysql" ? PostgresClient : MysqlClient;
    await expect(readTestMigration()).resolves.toEqual(["SELECT 1"]);
    expect(Client).toHaveBeenCalledTimes(1);
    expect(Other).not.toHaveBeenCalled();
    expect(generateTestMigrationFile).toHaveBeenCalledWith(
      expect.objectContaining({ release }),
    );
    expect(release).toHaveBeenCalledTimes(1);
  },
);
test("uses migration connection overrides before generating test SQL", async () => {
  config().db.dialect = "mysql";
  config().migration.db = {
    ...config().db,
    dialect: "postgres",
    database: "migration_db",
  };
  await readTestMigration();
  expect(PostgresClient).toHaveBeenCalledWith(
    expect.objectContaining({ dialect: "postgres", database: "migration_db" }),
  );
});
test("propagates generation errors after cleanup without terminating the caller", async () => {
  const failure = new Error("generation failed");
  jest.mocked(generateTestMigrationFile).mockRejectedValueOnce(failure);
  await expect(readTestMigration()).rejects.toBe(failure);
  expect(release).toHaveBeenCalledTimes(1);
});
test("propagates non-missing-file read errors without opening a connection", async () => {
  mkdirSync(join(directory, "test.migration.json"));
  await expect(readTestMigration()).rejects.toMatchObject({ code: "EISDIR" });
  expect(generateTestMigrationFile).not.toHaveBeenCalled();
  expect(MysqlClient).not.toHaveBeenCalled();
  expect(PostgresClient).not.toHaveBeenCalled();
});
test("does not hide invalid generated JSON and still closes the client", async () => {
  jest.mocked(generateTestMigrationFile).mockImplementationOnce(async () => {
    writeFileSync(join(directory, "test.migration.json"), "invalid");
  });
  await expect(readTestMigration()).rejects.toBeInstanceOf(SyntaxError);
  expect(release).toHaveBeenCalledTimes(1);
});
