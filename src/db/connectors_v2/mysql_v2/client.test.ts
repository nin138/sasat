import { createConnection, createPool } from "mysql2/promise";
import { MysqlClient } from "./client.js";

jest.mock("mysql2/promise", () => ({
  createConnection: jest.fn(),
  createPool: jest.fn(),
}));

test("forwards parameterized queries and tracks pool release", async () => {
  const pool = {
    execute: jest.fn().mockResolvedValue([{ id: 1 }]),
    end: jest.fn().mockResolvedValue(undefined),
  };
  jest.mocked(createPool).mockReturnValue(pool as never);
  const client = new MysqlClient({ database: "test" }, { connectionLimit: 2 });
  await client.query("SELECT ? AS id", [1]);
  expect(pool.execute).toHaveBeenCalledWith("SELECT ? AS id", [1]);
  await client.command("UPDATE users SET name = ?", ["Ada"]);
  expect(pool.execute).toHaveBeenCalledWith("UPDATE users SET name = ?", [
    "Ada",
  ]);
  expect(client.released()).toBe(false);
  await client.release();
  expect(client.released()).toBe(true);
});

test.each([
  "commit",
  "rollback",
] as const)("starts a transaction and closes it on %s", async (action) => {
  jest.mocked(createPool).mockReturnValue({} as never);
  const connection = {
    execute: jest.fn().mockResolvedValue([]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
  };
  jest.mocked(createConnection).mockResolvedValue(connection as never);
  const transaction = await new MysqlClient({ database: "test" }).transaction();
  await transaction.query("SELECT ?", [1]);
  await transaction.command("DELETE FROM users WHERE id = ?", [2]);
  expect(connection.execute.mock.calls).toEqual([
    ["SELECT ?", [1]],
    ["DELETE FROM users WHERE id = ?", [2]],
  ]);
  await transaction[action]();
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection[action]).toHaveBeenCalledTimes(1);
  expect(connection.end).toHaveBeenCalledTimes(1);
});
