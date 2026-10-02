import { config } from "../config/config.js";
import type { DBClient } from "../db/connectors/dbClient.js";
import { MigrationController } from "./controller.js";
import { createCurrentMigrationDataStore } from "./exec/createCurrentMigrationDataStore.js";
import { Direction } from "./exec/getCurrentMigration.js";
import { getMigrationFileNames } from "./exec/getMigrationFiles.js";
import { readMigration } from "./exec/readMigrationFile.js";
import { StoreMigrator } from "./front/storeMigrator.js";

jest.mock("./exec/createCurrentMigrationDataStore.js", () => ({
  createCurrentMigrationDataStore: jest.fn(),
}));
jest.mock("./exec/getMigrationFiles.js", () => ({
  getMigrationFileNames: jest.fn(),
}));
jest.mock("./exec/readMigrationFile.js", () => ({ readMigration: jest.fn() }));

const options = {
  silent: true,
  dry: false,
  generateFiles: false,
  skipBuild: true,
};
let original: ReturnType<typeof config>;
beforeEach(() => {
  original = structuredClone(config());
  config().migration.target = undefined;
  jest.mocked(getMigrationFileNames).mockReturnValue(["001.ts", "002.ts"]);
  jest
    .mocked(createCurrentMigrationDataStore)
    .mockResolvedValue(StoreMigrator.deserialize({ tables: [] }));
  jest.mocked(readMigration).mockImplementation(async (store, name) => {
    store.sql("SQL " + name);
    return store;
  });
});
afterEach(() => Object.assign(config(), original));

test("executes each pending migration with only that migration's SQL", async () => {
  const seen: string[][] = [];
  const execute = jest.fn(async (_client, store) => {
    seen.push([...store.getSql()]);
  });
  const result = await new MigrationController().migrate(
    {} as DBClient,
    undefined,
    options,
    execute,
  );
  expect(seen).toEqual([["SQL 001.ts"], ["SQL 002.ts"]]);
  expect(result.currentMigration).toBe("002.ts");
  expect(readMigration).toHaveBeenNthCalledWith(
    1,
    expect.anything(),
    "001.ts",
    Direction.Up,
  );
});

test("rolls back to the configured target", async () => {
  config().migration.target = "001.ts";
  const execute = jest.fn().mockResolvedValue(undefined);
  await new MigrationController().migrate(
    {} as DBClient,
    "002.ts",
    options,
    execute,
  );
  expect(readMigration).toHaveBeenCalledTimes(1);
  expect(readMigration).toHaveBeenCalledWith(
    expect.anything(),
    "002.ts",
    Direction.Down,
  );
});

test("stops after the first execution failure", async () => {
  const execute = jest.fn().mockRejectedValue(new Error("failed"));
  await expect(
    new MigrationController().migrate(
      {} as DBClient,
      undefined,
      options,
      execute,
    ),
  ).rejects.toThrow("failed");
  expect(readMigration).toHaveBeenCalledTimes(1);
});
