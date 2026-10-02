import { Console } from "../../cli/console.js";
import type { DBClient } from "../../db/connectors/dbClient.js";
import { StoreMigrator } from "../front/storeMigrator.js";
import { Direction } from "./getCurrentMigration.js";
import { runMigration } from "./runMigration.js";

beforeEach(() => {
  jest.spyOn(Console, "error").mockImplementation(() => {});
});

const options = {
  silent: true,
  dry: false,
  generateFiles: false,
  skipBuild: true,
};
function fixture() {
  const tx = {
    rawQuery: jest.fn().mockResolvedValue([]),
    query: jest.fn().mockResolvedValue([]),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };
  const client = { transaction: jest.fn().mockResolvedValue(tx) };
  const store = StoreMigrator.deserialize({ tables: [] });
  store.sql("SELECT 1", "SELECT 2");
  return { tx, client, store };
}

test("executes queued SQL before recording and committing the migration", async () => {
  const { tx, client, store } = fixture();
  await runMigration(
    client as unknown as DBClient,
    store,
    "001.ts",
    Direction.Up,
    options,
  );
  expect(tx.rawQuery.mock.calls).toEqual([["SELECT 1"], ["SELECT 2"]]);
  expect(tx.query).toHaveBeenCalledTimes(1);
  expect(tx.commit).toHaveBeenCalledTimes(1);
  expect(tx.rollback).not.toHaveBeenCalled();
  expect(tx.query.mock.invocationCallOrder[0]).toBeGreaterThan(
    tx.rawQuery.mock.invocationCallOrder[1],
  );
  expect(store.getSql()).toEqual([]);
});

test("dry run drains SQL without opening a transaction", async () => {
  const { client, store } = fixture();
  await runMigration(
    client as unknown as DBClient,
    store,
    "001.ts",
    Direction.Up,
    { ...options, dry: true },
  );
  expect(client.transaction).not.toHaveBeenCalled();
  expect(store.getSql()).toEqual([]);
});

test("rolls back SQL failures and propagates the original error without terminating the process", async () => {
  const { tx, client, store } = fixture();
  const error = new Error("SQL failed");
  tx.rawQuery.mockRejectedValueOnce(error);
  const exit = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process exited");
  });
  await expect(
    runMigration(
      client as unknown as DBClient,
      store,
      "001.ts",
      Direction.Up,
      options,
    ),
  ).rejects.toBe(error);
  expect(tx.rollback).toHaveBeenCalledTimes(1);
  expect(tx.commit).not.toHaveBeenCalled();
  expect(exit).not.toHaveBeenCalled();
});

test("rolls back if writing migration history fails", async () => {
  const { tx, client, store } = fixture();
  tx.query.mockRejectedValueOnce(new Error("history failed"));
  await expect(
    runMigration(
      client as unknown as DBClient,
      store,
      "001.ts",
      Direction.Down,
      options,
    ),
  ).rejects.toThrow("history failed");
  expect(tx.rollback).toHaveBeenCalledTimes(1);
  expect(tx.commit).not.toHaveBeenCalled();
});
