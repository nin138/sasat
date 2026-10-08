import { Pool } from "pg";
import { config, setConfig } from "../../../config/config.js";
import { getDbClient } from "../../getDbClient.js";
import { PostgresClient } from "./client.js";

jest.mock("pg", () => ({ ...jest.requireActual("pg"), Pool: jest.fn() }));
function setup() {
  const connection = {
    query: jest
      .fn()
      .mockResolvedValue({ rows: [], rowCount: 0, command: "BEGIN" }),
    release: jest.fn(),
  };
  const pool = {
    query: jest
      .fn()
      .mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1, command: "SELECT" }),
    connect: jest.fn().mockResolvedValue(connection),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
  jest.mocked(Pool).mockReturnValue(pool as never);
  const client = new PostgresClient({ database: "test" });
  return { client, pool, connection };
}
test("returns row arrays, command counts and generated insert IDs", async () => {
  const { client, pool } = setup();
  await expect(client.query`SELECT ${"a'b"}`).resolves.toEqual([{ id: 1 }]);
  expect(pool.query).toHaveBeenCalledWith("SELECT E'a''b'");
  pool.query.mockResolvedValueOnce({
    rows: [{ __sasat_insert_id: 7 }],
    rowCount: 1,
    command: "INSERT",
  } as never);
  await expect(client.rawCommand("INSERT")).resolves.toEqual({
    insertId: 7,
    affectedRows: 1,
    changedRows: 0,
  });
  pool.query.mockResolvedValueOnce({
    rows: [],
    rowCount: 2,
    command: "UPDATE",
  });
  await expect(client.rawCommand("UPDATE")).resolves.toEqual({
    insertId: 0,
    affectedRows: 2,
    changedRows: 2,
  });
});
test.each(["commit", "rollback"] as const)(
  "uses one pooled connection and returns it after %s",
  async (action) => {
    const { client, pool, connection } = setup();
    const tx = await client.transaction();
    expect(tx.sql).toBe(client.sql);
    await tx.query`SELECT ${"ok"}`;
    await tx[action]();
    await tx[action]();
    expect(connection.query.mock.calls.map((c) => c[0])).toEqual([
      "BEGIN",
      "SELECT E'ok'",
      action.toUpperCase(),
    ]);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(pool.query).not.toHaveBeenCalled();
    await expect(tx.rawQuery("SELECT 1")).rejects.toThrow("finished");
  },
);
test("discards a connection when BEGIN fails", async () => {
  const { client, connection } = setup();
  connection.query.mockRejectedValueOnce(new Error("begin failed"));
  await expect(client.transaction()).rejects.toThrow("begin failed");
  expect(connection.release).toHaveBeenCalledWith(true);
});
test("discards a connection when COMMIT fails and can release the pool once", async () => {
  const { client, connection, pool } = setup();
  const tx = await client.transaction();
  expect(tx.sql).toBe(client.sql);
  connection.query.mockRejectedValueOnce(new Error("commit failed"));
  await expect(tx.commit()).rejects.toThrow("commit failed");
  expect(connection.release).toHaveBeenCalledWith(true);
  await client.release();
  await client.release();
  expect(client.isReleased()).toBe(true);
  expect(pool.end).toHaveBeenCalledTimes(1);
});

test("selects PostgreSQL from config and rejects changing a live pool's engine", async () => {
  const { client: injected } = setup();
  await injected.release();
  const original = structuredClone(config().db);
  setConfig({
    db: {
      dialect: "postgres",
      host: "localhost",
      port: 5432,
      database: "test",
    },
  });
  const client = getDbClient({ max: 4 });
  try {
    expect(client).toBeInstanceOf(PostgresClient);
    expect(getDbClient()).toBe(client);
    await client.rawQuery("SELECT 1");
    expect(Pool).toHaveBeenLastCalledWith(
      expect.objectContaining({ max: 4, port: 5432 }),
    );
    setConfig({ db: { dialect: "mysql" } });
    expect(() => getDbClient()).toThrow(
      "already initialized with different settings",
    );
  } finally {
    await client.release();
    setConfig({ db: { ...original, dialect: original.dialect ?? "mysql" } });
  }
});

test("initializes one PostgreSQL pool for concurrent first queries", async () => {
  const { client, pool } = setup();
  expect(Pool).not.toHaveBeenCalled();
  await Promise.all([client.rawQuery("SELECT 1"), client.rawQuery("SELECT 2")]);
  expect(Pool).toHaveBeenCalledTimes(1);
  await client.release();
  expect(pool.end).toHaveBeenCalledTimes(1);
});

test("releasing an unused PostgreSQL client does not initialize a pool", async () => {
  const { client, pool } = setup();
  await client.release();
  await client.release();
  expect(Pool).not.toHaveBeenCalled();
  expect(pool.end).not.toHaveBeenCalled();
  await expect(client.rawQuery("SELECT 1")).rejects.toThrow("released");
});

test("explicit discard destroys a session instead of returning it to the pool", async () => {
  const { client, connection } = setup();
  const tx = await client.transaction();
  await tx.discard();
  await tx.rollback();
  await tx.discard();
  expect(connection.release).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledWith(true);
  await expect(tx.rawQuery("SELECT 1")).rejects.toThrow("finished");
});

test("bound PostgreSQL queries pass text and values separately without a statement name", async () => {
  const { client, pool } = setup();
  const text = "SELECT $1::bigint AS id, $2::text AS label";
  await expect(
    client.executeQuery({ text, values: [9007199254740993n, "a'\\文字"] }),
  ).resolves.toEqual([{ id: 1 }]);
  expect(pool.query).toHaveBeenCalledWith(text, [
    "9007199254740993",
    "a'\\文字",
  ]);
  await client.release();
  await expect(client.executeQuery({ text, values: [1, "x"] })).rejects.toThrow(
    "released",
  );
  expect(pool.query).toHaveBeenCalledTimes(1);
});

test("bound PostgreSQL commands preserve insert IDs and update counts", async () => {
  const { client, pool } = setup();
  pool.query.mockResolvedValueOnce({
    rows: [{ __sasat_insert_id: "9007199254740993" }],
    rowCount: 1,
    command: "INSERT",
  } as never);
  await expect(
    client.executeCommand({ text: "INSERT", values: [] }),
  ).resolves.toEqual({
    insertId: 9007199254740993n,
    affectedRows: 1,
    changedRows: 0,
  });
  pool.query.mockResolvedValueOnce({
    rows: [],
    rowCount: 2,
    command: "UPDATE",
  });
  await expect(
    client.executeCommand({ text: "UPDATE", values: [] }),
  ).resolves.toEqual({ insertId: 0, affectedRows: 2, changedRows: 2 });
});

test("bound PostgreSQL transactions share the session and can roll back after failure", async () => {
  const { client, pool, connection } = setup();
  const tx = await client.transaction();
  await tx.executeQuery({ text: "SELECT $1", values: [42] });
  expect(connection.query).toHaveBeenCalledWith("SELECT $1", [42]);
  connection.query.mockRejectedValueOnce(new Error("statement failed"));
  await expect(
    tx.executeCommand({ text: "INSERT $1", values: [null] }),
  ).rejects.toThrow("statement failed");
  expect(connection.release).not.toHaveBeenCalled();
  await tx.rollback();
  await expect(
    tx.executeQuery({ text: "SELECT $1", values: [1] }),
  ).rejects.toThrow("finished");
  await expect(
    tx.executeCommand({ text: "DELETE", values: [] }),
  ).rejects.toThrow("finished");
  expect(connection.release).toHaveBeenCalledTimes(1);
  expect(pool.query).not.toHaveBeenCalled();
});

test.each(["commit", "rollback"] as const)(
  "discard policy completes %s before destroying the PG session",
  async (action) => {
    const { client, connection } = setup();
    const options: { connection: "reuse" | "discard" } = {
      connection: "discard",
    };
    const pending = client.transaction(options);
    options.connection = "reuse";
    const tx = await pending;
    await tx[action]();
    await tx.discard();
    expect(connection.query.mock.calls.map((c) => c[0])).toEqual([
      "BEGIN",
      action.toUpperCase(),
    ]);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledWith(true);
    expect(connection.release.mock.invocationCallOrder[0]).toBeGreaterThan(
      connection.query.mock.invocationCallOrder[1],
    );
    await client.release();
  },
);

test("PostgreSQL preserves both BEGIN and release failures", async () => {
  const { client, connection } = setup();
  const begin = new Error("begin");
  const release = new Error("release");
  connection.query.mockRejectedValueOnce(begin);
  connection.release.mockImplementation(() => {
    throw release;
  });
  await expect(client.withTransaction(async () => 1)).rejects.toMatchObject({
    cause: begin,
    errors: [begin, release],
  });
  await client.release();
});
