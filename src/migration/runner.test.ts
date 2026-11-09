import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../config/config.js";
import type { DBClient } from "../db/connectors/dbClient.js";
import type { DatabaseDriver } from "../db/drivers.js";
import { getDbClient } from "../db/getDbClient.js";
import { MigrationController } from "./controller.js";
import { getCurrentMigration } from "./exec/getCurrentMigration.js";
import { withMigrationLock } from "./exec/withMigrationLock.js";
import { runMigrationBundle } from "./runner.js";

jest.mock("../db/getDbClient.js", () => ({ getDbClient: jest.fn() }));
jest.mock("./exec/getCurrentMigration.js", () => ({
  getCurrentMigration: jest.fn(),
}));
jest.mock("./exec/withMigrationLock.js", () => ({
  withMigrationLock: jest.fn(async (client, apply) => apply(client)),
}));
let directory: string;
let originalDirectory: string;
let original: ReturnType<typeof config>;
const definitions = {
  files: ["001.ts", "002.ts"],
  initialSchema: { tables: [] },
  load: jest.fn(),
};
const driver = { dialect: "mysql", driver: {} } as DatabaseDriver;
const release = jest.fn();
const client = { release } as unknown as DBClient;
const provider = jest.fn();
beforeEach(() => {
  original = structuredClone(config());
  directory = mkdtempSync(join(tmpdir(), "sasat-runner-"));
  originalDirectory = process.cwd();
  process.chdir(directory);
  jest.spyOn(console, "log").mockImplementation(() => {});
  release.mockReset().mockResolvedValue(undefined);
  provider.mockReset().mockResolvedValue(client);
  jest.mocked(getDbClient).mockReturnValue(client);
  jest.mocked(getCurrentMigration).mockReset().mockResolvedValue(undefined);
  jest
    .spyOn(MigrationController.prototype, "migrate")
    .mockResolvedValue({ store: { tables: [] }, currentMigration: "002.ts" });
});
afterEach(() => {
  Object.assign(config(), original);
  process.chdir(originalDirectory);
  rmSync(directory, { recursive: true, force: true });
});
const writeConfig = (value: object = {}) =>
  writeFileSync(join(directory, "runtime.yml"), JSON.stringify(value));
const run = (...args: string[]) =>
  runMigrationBundle(definitions, driver, args, provider);

test.each(["--help", "-h", "--list"])(
  "%s does not require config or evaluate clients/definitions",
  async (flag) => {
    await run(flag);
    expect(provider).not.toHaveBeenCalled();
    expect(definitions.load).not.toHaveBeenCalled();
    expect(getCurrentMigration).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  },
);
test.each(["--unknown", "--config", "--target"])(
  "rejects invalid arguments %s before client creation",
  async (flag) => {
    await expect(run(flag)).rejects.toThrow();
    expect(provider).not.toHaveBeenCalled();
  },
);
test("rejects missing config, mismatched dialect and unknown target before loading clients", async () => {
  await expect(run()).rejects.toThrow("configuration file not found");
  writeConfig({ db: { dialect: "postgres" } });
  await expect(run("-c", "runtime.yml")).rejects.toThrow(
    "dialect does not match",
  );
  writeConfig();
  await expect(run("-c", "runtime.yml", "-t", "missing.ts")).rejects.toThrow(
    "migration target not found",
  );
  expect(provider).not.toHaveBeenCalled();
});
test("applies config, connection override and target before invoking an async provider", async () => {
  writeConfig({
    db: { database: "app" },
    migration: { db: { database: "migration" } },
  });
  provider.mockImplementationOnce(async () => {
    expect(config().db.database).toBe("migration");
    expect(config().migration.target).toBe("001.ts");
    return client;
  });
  await run("-c", "runtime.yml", "-t", "001.ts", "-s");
  expect(withMigrationLock).toHaveBeenCalledWith(client, expect.any(Function));
  expect(getCurrentMigration).toHaveBeenCalledWith(
    client,
    { dry: false, silent: true, generateFiles: false, skipBuild: true },
    definitions.files,
  );
  expect(MigrationController.prototype.migrate).toHaveBeenCalledWith(
    client,
    undefined,
    expect.objectContaining({ generateFiles: false }),
  );
  expect(release).toHaveBeenCalledTimes(1);
  expect(console.log).not.toHaveBeenCalled();
});
test("dry run bypasses the lock and reports the resulting target", async () => {
  writeConfig();
  await run("-c", "runtime.yml", "-d");
  expect(withMigrationLock).not.toHaveBeenCalled();
  expect(console.log).toHaveBeenCalledWith("dry run target is 002.ts");
  expect(release).toHaveBeenCalledTimes(1);
});
test("uses the bundled driver when no application provider exists", async () => {
  writeFileSync(join(directory, "sasat.yml"), "{}");
  await runMigrationBundle(definitions, driver, []);
  expect(getDbClient).toHaveBeenCalledWith(undefined, undefined, driver);
  expect(console.log).toHaveBeenCalledWith("current migration is 002.ts");
});
test.each(["history", "migration"])(
  "releases the custom client on %s failure",
  async (stage) => {
    writeConfig();
    const error = new Error(`${stage} failed`);
    if (stage === "history")
      jest.mocked(getCurrentMigration).mockRejectedValueOnce(error);
    else
      jest
        .mocked(MigrationController.prototype.migrate)
        .mockRejectedValueOnce(error);
    await expect(run("-c", "runtime.yml", "-d")).rejects.toBe(error);
    expect(release).toHaveBeenCalledTimes(1);
  },
);
test("does not fall back when the custom provider fails", async () => {
  writeConfig();
  const error = new Error("custom client failed");
  provider.mockRejectedValueOnce(error);
  await expect(run("-c", "runtime.yml")).rejects.toBe(error);
  expect(getDbClient).not.toHaveBeenCalled();
  expect(withMigrationLock).not.toHaveBeenCalled();
  expect(release).not.toHaveBeenCalled();
});
test("reports cleanup failure instead of succeeding", async () => {
  writeConfig();
  const error = new Error("cleanup failed");
  release.mockRejectedValueOnce(error);
  await expect(run("-c", "runtime.yml", "-d")).rejects.toBe(error);
});
