import { config, setConfig } from "../config/config.js";
import { makeTestDB } from "./makeTestDB.js";
import { PostgresTestDBClient } from "./postgresTestDBClient.js";
import { readTestMigration } from "./readTestMigration.js";
import { TestDBClient } from "./testDBClient.js";

jest.mock("./postgresTestDBClient.js", () => ({
  PostgresTestDBClient: { create: jest.fn() },
}));
jest.mock("./testDBClient.js", () => ({ TestDBClient: { create: jest.fn() } }));
jest.mock("./readTestMigration.js", () => ({ readTestMigration: jest.fn() }));

test("creates an isolated test database and runs its migration SQL", async () => {
  const client = {
    rawQuery: jest.fn().mockResolvedValue([]),
    release: jest.fn(),
  };
  jest.mocked(TestDBClient.create).mockResolvedValue(client as never);
  jest
    .mocked(readTestMigration)
    .mockResolvedValue([
      "CREATE TABLE example(id int)",
      "INSERT INTO example VALUES (1)",
    ]);
  const conf = {
    host: "test",
    port: 3306,
    user: "tester",
    database: "original",
  };
  await expect(makeTestDB(conf)).resolves.toBe(client);
  expect(TestDBClient.create).toHaveBeenCalledWith(
    expect.objectContaining({
      host: "test",
      database: expect.stringMatching(/^sasat_test_[a-zA-Z0-9]{8}$/),
    }),
  );
  expect(client.rawQuery).toHaveBeenCalledWith(
    "CREATE TABLE example(id int);INSERT INTO example VALUES (1)",
  );
});

test("cleans up a PostgreSQL test database after migration failure", async () => {
  const original = structuredClone(config().db);
  const client = {
    rawQuery: jest.fn().mockRejectedValue(new Error("bad migration")),
    release: jest.fn().mockResolvedValue(undefined),
  };
  jest.mocked(PostgresTestDBClient.create).mockResolvedValue(client as never);
  jest.mocked(readTestMigration).mockResolvedValue(["INVALID SQL"]);
  setConfig({ db: { dialect: "postgres" } });
  try {
    await expect(
      makeTestDB({
        host: "test",
        port: 5432,
        user: "tester",
        database: "unused",
      }),
    ).rejects.toThrow("bad migration");
    expect(client.release).toHaveBeenCalledTimes(1);
    await expect(
      makeTestDB({
        host: "test",
        port: 3306,
        user: "tester",
        database: "unused",
        dialect: "mysql",
      }),
    ).rejects.toThrow("must match");
  } finally {
    setConfig({ db: { ...original, dialect: original.dialect ?? "mysql" } });
  }
});
