import { StoreMigrator } from "../front/storeMigrator.js";
import { createCurrentMigrationDataStore } from "./createCurrentMigrationDataStore.js";
import { getMigrationFileNames } from "./getMigrationFiles.js";
import { readMigration } from "./readMigrationFile.js";

jest.mock("./getMigrationFiles.js", () => ({
  getMigrationFileNames: jest.fn(),
}));
jest.mock("./readMigrationFile.js", () => ({ readMigration: jest.fn() }));

beforeEach(() => {
  jest
    .spyOn(StoreMigrator, "new")
    .mockImplementation(() => StoreMigrator.deserialize({ tables: [] }));
  jest
    .mocked(getMigrationFileNames)
    .mockReturnValue(["001.ts", "002.ts", "003.ts"]);
  jest.mocked(readMigration).mockImplementation(async (store, file) => {
    store.createTable(file.replace(".ts", ""), (table) =>
      table.column("id").int().primary(),
    );
    return store;
  });
});

test("replays only migrations up to the target and clears pending SQL", async () => {
  const store = await createCurrentMigrationDataStore("002.ts");
  expect(store.serialize().tables.map((t) => t.tableName)).toEqual([
    "001",
    "002",
  ]);
  expect(store.getSql()).toEqual([]);
  expect(readMigration).toHaveBeenCalledTimes(2);
});

test("returns the initial store when there is no current migration", async () => {
  expect(
    (await createCurrentMigrationDataStore(undefined)).serialize(),
  ).toEqual({ tables: [] });
  expect(readMigration).not.toHaveBeenCalled();
});

test("rejects an unknown reconstruction target instead of returning an empty schema", async () => {
  await expect(createCurrentMigrationDataStore("missing.ts")).rejects.toThrow(
    "migration target not found",
  );
  expect(StoreMigrator.new).not.toHaveBeenCalled();
  expect(readMigration).not.toHaveBeenCalled();
});
