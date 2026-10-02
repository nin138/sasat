import { makeTestDB } from "./makeTestDB.js";
import { readTestMigration } from "./readTestMigration.js";
import { TestDBClient } from "./testDBClient.js";

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
