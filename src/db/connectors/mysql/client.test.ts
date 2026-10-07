import { createConnection, createPool } from "mysql2/promise";
import { config, setConfig } from "../../../config/config.js";
import { getDbClient } from "../../getDbClient.js";
import { MysqlClient } from "./client.js";
import { MysqlPoolClient } from "./poolClient.js";

jest.mock("mysql2/promise", () => ({
  createConnection: jest.fn(),
  createPool: jest.fn(),
}));

const connection = () => ({
  query: jest.fn().mockResolvedValue([[{ id: 1 }], []]),
  beginTransaction: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  end: jest.fn().mockResolvedValue(undefined),
});

test("formats tagged queries, logs SQL, unwraps results, and closes connections", async () => {
  const c = connection();
  jest.mocked(createConnection).mockResolvedValue(c as never);
  const logger = jest.fn();
  const client = new MysqlClient({ database: "test" }, logger);
  await expect(client.query`SELECT ${"Ada"}`).resolves.toEqual([{ id: 1 }]);
  expect(c.query).toHaveBeenCalledWith("SELECT 'Ada'");
  expect(logger).toHaveBeenCalledWith("SELECT 'Ada'");
  expect(c.end).toHaveBeenCalledTimes(1);
  expect(createConnection).toHaveBeenCalledWith({
    dateStrings: true,
    database: "test",
  });
});

test("closes a connection when a query fails", async () => {
  const c = connection();
  c.query.mockRejectedValue(new Error("query failed"));
  jest.mocked(createConnection).mockResolvedValue(c as never);
  await expect(new MysqlClient({}).rawQuery("broken")).rejects.toThrow(
    "query failed",
  );
  expect(c.end).toHaveBeenCalledTimes(1);
});

test.each(["commit", "rollback"] as const)(
  "ends a transaction connection after %s",
  async (action) => {
    const c = connection();
    jest.mocked(createConnection).mockResolvedValue(c as never);
    const client = new MysqlClient({});
    const transaction = await client.transaction();
    expect(transaction.sql).toBe(client.sql);
    expect(c.beginTransaction).toHaveBeenCalledTimes(1);
    await expect(transaction.rawQuery("SELECT 1")).resolves.toEqual([
      { id: 1 },
    ]);
    await transaction[action]();
    expect(c[action]).toHaveBeenCalledTimes(1);
    expect(c.end).toHaveBeenCalledTimes(1);
  },
);

test.each(["commit", "rollback"] as const)(
  "closes the connection when %s fails",
  async (action) => {
    const c = connection();
    c[action].mockRejectedValue(new Error("transaction failed"));
    jest.mocked(createConnection).mockResolvedValue(c as never);
    const client = new MysqlClient({});
    const transaction = await client.transaction();
    expect(transaction.sql).toBe(client.sql);
    await expect(transaction[action]()).rejects.toThrow("transaction failed");
    expect(c.end).toHaveBeenCalledTimes(1);
  },
);

test("closes connections if starting a transaction fails", async () => {
  const c = connection();
  c.beginTransaction.mockRejectedValue(new Error("begin failed"));
  jest.mocked(createConnection).mockResolvedValue(c as never);
  await expect(new MysqlClient({}).transaction()).rejects.toThrow(
    "begin failed",
  );
  expect(c.end).toHaveBeenCalledTimes(1);
});

test("unwraps pool responses and marks a released pool", async () => {
  const pool = connection();
  pool.query.mockResolvedValue([
    { insertId: 3, affectedRows: 1, changedRows: 0 },
    [],
  ] as never);
  jest.mocked(createPool).mockReturnValue(pool as never);
  const client = new MysqlPoolClient({ database: "test" });
  expect(client.isReleased()).toBe(false);
  await expect(
    client.command`INSERT INTO users(name) VALUES (${"Ada"})`,
  ).resolves.toMatchObject({ insertId: 3 });
  await client.release();
  expect(client.isReleased()).toBe(true);
  expect(pool.end).toHaveBeenCalledTimes(1);
});

test("reuses the shared pool until it is released", async () => {
  jest.mocked(createPool).mockImplementation(() => connection() as never);
  const first = getDbClient({ database: "test" });
  expect(getDbClient()).toBe(first);
  await first.release();
  const second = getDbClient({ database: "test" });
  expect(second).not.toBe(first);
  await second.release();
});

test("rejects changed explicit connection options without replacing or closing the active pool", async () => {
  const pool = connection();
  jest.mocked(createPool).mockReturnValue(pool as never);
  const first = getDbClient({ database: "tenant_a" });
  await first.rawQuery("SELECT 1");
  try {
    expect(getDbClient({ database: "tenant_a" })).toBe(first);
    expect(getDbClient()).toBe(first);
    expect(() => getDbClient({ database: "tenant_b" })).toThrow(
      "already initialized with different settings",
    );
    expect(createPool).toHaveBeenCalledTimes(1);
    expect(pool.end).not.toHaveBeenCalled();
    await first.rawQuery("SELECT 1");
    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  } finally {
    await first.release();
  }
  const second = getDbClient({ database: "tenant_b" });
  await second.rawQuery("SELECT 1");
  expect(createPool).toHaveBeenLastCalledWith(
    expect.objectContaining({ database: "tenant_b" }),
  );
  await second.release();
});

test("rejects a changed logger instead of ignoring it", async () => {
  jest.mocked(createPool).mockImplementation(() => connection() as never);
  const logger = jest.fn();
  const first = getDbClient(undefined, logger);
  try {
    expect(getDbClient(undefined, logger)).toBe(first);
    expect(getDbClient()).toBe(first);
    expect(() => getDbClient(undefined, jest.fn())).toThrow(
      "already initialized with different settings",
    );
  } finally {
    await first.release();
  }
});

test("detects changes to the default database configuration", async () => {
  jest.mocked(createPool).mockImplementation(() => connection() as never);
  const original = structuredClone(config().db);
  const first = getDbClient();
  try {
    setConfig({ db: { database: "changed_database" } });
    expect(() => getDbClient()).toThrow(
      "already initialized with different settings",
    );
  } finally {
    await first.release();
    config().db = original;
  }
});

test("pool client closes the dedicated connection when BEGIN fails", async () => {
  const c = connection();
  const error = new Error("begin failed");
  c.beginTransaction.mockRejectedValue(error);
  const pool = connection();
  jest.mocked(createPool).mockReturnValue(pool as never);
  jest.mocked(createConnection).mockResolvedValue(c as never);
  const client = new MysqlPoolClient({ database: "test" });
  try {
    await expect(client.transaction()).rejects.toBe(error);
    expect(c.end).toHaveBeenCalledTimes(1);
    expect(c.commit).not.toHaveBeenCalled();
    expect(c.rollback).not.toHaveBeenCalled();
    expect(pool.end).not.toHaveBeenCalled();
    await expect(client.rawQuery("SELECT 1")).resolves.toEqual([{ id: 1 }]);
  } finally {
    await client.release();
  }
});

test("initializes one MySQL pool for concurrent first queries", async () => {
  const pool = connection();
  jest.mocked(createPool).mockReturnValue(pool as never);
  const client = new MysqlPoolClient({});
  expect(createPool).not.toHaveBeenCalled();
  await Promise.all([client.rawQuery("SELECT 1"), client.rawQuery("SELECT 2")]);
  expect(createPool).toHaveBeenCalledTimes(1);
  await client.release();
});

test("releasing an unused MySQL pool does not initialize it", async () => {
  const client = new MysqlPoolClient({});
  await client.release();
  await client.release();
  expect(createPool).not.toHaveBeenCalled();
  await expect(client.rawQuery("SELECT 1")).rejects.toThrow("released");
});
