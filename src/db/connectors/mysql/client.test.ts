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
  destroy: jest.fn(),
  release: jest.fn(),
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
    supportBigNumbers: true,
    bigNumberStrings: true,
    typeCast: expect.any(Function),
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

test("pool client discards the borrowed connection when BEGIN fails", async () => {
  const c = connection();
  const error = new Error("begin failed");
  c.beginTransaction.mockRejectedValue(error);
  const pool = connection();
  const getConnection = jest.fn().mockResolvedValue(c);
  jest.mocked(createPool).mockReturnValue({ ...pool, getConnection } as never);
  const client = new MysqlPoolClient({ database: "test" });
  try {
    await expect(client.transaction()).rejects.toBe(error);
    expect(c.destroy).toHaveBeenCalledTimes(1);
    expect(c.release).not.toHaveBeenCalled();
    expect(c.end).not.toHaveBeenCalled();
    expect(createConnection).not.toHaveBeenCalled();
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

test("bound MySQL calls use execute and log only SQL text", async () => {
  const c = {
    ...connection(),
    execute: jest.fn().mockResolvedValue([[{ id: 1 }], []]),
  };
  jest.mocked(createConnection).mockResolvedValue(c as never);
  const logger = jest.fn();
  const client = new MysqlClient({}, logger);
  const text = "SELECT ? AS id, ? AS label";
  await expect(
    client.executeQuery({ text, values: [9007199254740993n, "secret'\\文字"] }),
  ).resolves.toEqual([{ id: 1 }]);
  expect(c.execute).toHaveBeenCalledWith(text, [
    "9007199254740993",
    "secret'\\文字",
  ]);
  expect(c.query).not.toHaveBeenCalled();
  expect(logger.mock.calls).toEqual([[text]]);
  expect(c.end).toHaveBeenCalledTimes(1);
});

test.each(["executeQuery", "executeCommand"] as const)(
  "closes a dedicated connection when %s fails",
  async (method) => {
    const c = {
      ...connection(),
      execute: jest.fn().mockRejectedValue(new Error("execute failed")),
    };
    jest.mocked(createConnection).mockResolvedValue(c as never);
    await expect(
      new MysqlClient({})[method]({ text: "broken ?", values: [1] }),
    ).rejects.toThrow("execute failed");
    expect(c.end).toHaveBeenCalledTimes(1);
  },
);

test("bound pool commands normalize insert IDs, and release prevents further execution", async () => {
  const pool = {
    ...connection(),
    execute: jest
      .fn()
      .mockResolvedValue([
        { insertId: "9007199254740993", affectedRows: 1, changedRows: 0 },
        [],
      ]),
  };
  jest.mocked(createPool).mockReturnValue(pool as never);
  const client = new MysqlPoolClient({});
  await expect(
    client.executeCommand({
      text: "INSERT INTO t VALUES (?)",
      values: ["1.25"],
    }),
  ).resolves.toEqual({
    insertId: 9007199254740993n,
    affectedRows: 1,
    changedRows: 0,
  });
  expect(pool.query).not.toHaveBeenCalled();
  expect(pool.end).not.toHaveBeenCalled();
  await client.release();
  await expect(
    client.executeQuery({ text: "SELECT ?", values: [1] }),
  ).rejects.toThrow("released");
  expect(pool.execute).toHaveBeenCalledTimes(1);
});

test("bound transaction calls reuse its connection and remain rollbackable after failure", async () => {
  const c = {
    ...connection(),
    execute: jest.fn().mockResolvedValue([[{ id: 1 }], []]),
  };
  jest.mocked(createConnection).mockResolvedValue(c as never);
  const tx = await new MysqlClient({}).transaction();
  await tx.executeQuery({ text: "SELECT ?", values: [1] });
  c.execute.mockRejectedValueOnce(new Error("statement failed"));
  await expect(
    tx.executeCommand({ text: "INSERT ?", values: [null] }),
  ).rejects.toThrow("statement failed");
  expect(c.end).not.toHaveBeenCalled();
  await tx.rollback();
  expect(createConnection).toHaveBeenCalledTimes(1);
  expect(c.rollback).toHaveBeenCalledTimes(1);
  expect(c.end).toHaveBeenCalledTimes(1);
});

test.each(["commit", "rollback"] as const)(
  "pooled transactions return a healthy session once after %s",
  async (action) => {
    const c = {
      ...connection(),
      execute: jest.fn().mockResolvedValue([[{ id: 1 }], []]),
    };
    const pool = {
      ...connection(),
      getConnection: jest.fn().mockResolvedValue(c),
    };
    jest.mocked(createPool).mockReturnValue(pool as never);
    const client = new MysqlPoolClient({
      database: "isolated",
      connectionLimit: 2,
    });
    const tx = await client.transaction();
    expect(tx.sql).toBe(client.sql);
    await tx.rawQuery("SELECT 1");
    await tx.executeQuery({ text: "SELECT ? AS id", values: [1] });
    await tx[action]();
    await tx.commit();
    await tx.rollback();
    await tx.discard();
    expect(c[action]).toHaveBeenCalledTimes(1);
    expect(c.release).toHaveBeenCalledTimes(1);
    expect(c.end).not.toHaveBeenCalled();
    expect(c.destroy).not.toHaveBeenCalled();
    expect(createConnection).not.toHaveBeenCalled();
    expect(createPool).toHaveBeenCalledWith(
      expect.objectContaining({ database: "isolated", connectionLimit: 2 }),
    );
    await expect(tx.rawQuery("SELECT 1")).rejects.toThrow("finished");
    await expect(
      tx.executeCommand({ text: "UPDATE t SET n=?", values: [1] }),
    ).rejects.toThrow("finished");
    expect(c.query).toHaveBeenCalledTimes(1);
    expect(c.execute).toHaveBeenCalledTimes(1);
    await client.release();
  },
);

test.each(["commit", "rollback"] as const)(
  "pooled transactions discard an unsafe session when %s fails",
  async (action) => {
    const c = connection();
    const error = new Error("finish failed");
    c[action].mockRejectedValue(error);
    jest.mocked(createPool).mockReturnValue({
      ...connection(),
      getConnection: jest.fn().mockResolvedValue(c),
    } as never);
    const client = new MysqlPoolClient({});
    const tx = await client.transaction();
    await expect(tx[action]()).rejects.toBe(error);
    await tx.rollback();
    await tx.discard();
    expect(c.destroy).toHaveBeenCalledTimes(1);
    expect(c.release).not.toHaveBeenCalled();
    expect(c.end).not.toHaveBeenCalled();
    await client.release();
  },
);

test("discard destroys a reserved session and never sends COMMIT or ROLLBACK", async () => {
  const c = connection();
  jest.mocked(createPool).mockReturnValue({
    ...connection(),
    getConnection: jest.fn().mockResolvedValue(c),
  } as never);
  const client = new MysqlPoolClient({});
  const tx = await client.transaction();
  await tx.discard();
  await tx.discard();
  await tx.rollback();
  expect(c.destroy).toHaveBeenCalledTimes(1);
  expect(c.release).not.toHaveBeenCalled();
  expect(c.commit).not.toHaveBeenCalled();
  expect(c.rollback).not.toHaveBeenCalled();
  await expect(tx.rawQuery("SELECT 1")).rejects.toThrow("finished");
  await client.release();
});

test("an acquisition failure never falls back to a dedicated connection", async () => {
  const error = new Error("pool capacity exhausted");
  const getConnection = jest.fn().mockRejectedValue(error);
  jest
    .mocked(createPool)
    .mockReturnValue({ ...connection(), getConnection } as never);
  const client = new MysqlPoolClient({});
  await expect(client.transaction()).rejects.toBe(error);
  expect(createConnection).not.toHaveBeenCalled();
  await client.release();
  await expect(client.transaction()).rejects.toThrow("released");
  expect(getConnection).toHaveBeenCalledTimes(1);
});

test("statement failure keeps the borrowed session available for rollback", async () => {
  const c = {
    ...connection(),
    execute: jest.fn().mockRejectedValue(new Error("constraint failed")),
  };
  jest.mocked(createPool).mockReturnValue({
    ...connection(),
    getConnection: jest.fn().mockResolvedValue(c),
  } as never);
  const client = new MysqlPoolClient({});
  const tx = await client.transaction();
  await expect(
    tx.executeCommand({ text: "INSERT INTO t VALUES (?)", values: [1] }),
  ).rejects.toThrow("constraint failed");
  expect(c.release).not.toHaveBeenCalled();
  expect(c.destroy).not.toHaveBeenCalled();
  await tx.rollback();
  expect(c.release).toHaveBeenCalledTimes(1);
  expect(c.destroy).not.toHaveBeenCalled();
  await client.release();
});

test.each(["commit", "rollback"] as const)(
  "discard policy completes %s before destroying the pooled connection",
  async (action) => {
    const c = connection();
    const order: string[] = [];
    c[action].mockImplementation(async () => {
      order.push(action);
    });
    c.destroy.mockImplementation(() => {
      order.push("destroy");
    });
    jest.mocked(createPool).mockReturnValue({
      ...connection(),
      getConnection: jest.fn().mockResolvedValue(c),
    } as never);
    const client = new MysqlPoolClient({});
    const options: { connection: "reuse" | "discard" } = {
      connection: "discard",
    };
    const pending = client.transaction(options);
    options.connection = "reuse";
    const tx = await pending;
    await tx[action]();
    await tx.discard();
    expect(order).toEqual([action, "destroy"]);
    expect(c.release).not.toHaveBeenCalled();
    expect(c.end).not.toHaveBeenCalled();
    await client.release();
  },
);

test("BEGIN and destroy failures both survive acquisition rejection", async () => {
  const c = connection();
  const begin = new Error("begin");
  const destroy = new Error("destroy");
  c.beginTransaction.mockRejectedValue(begin);
  c.destroy.mockImplementation(() => {
    throw destroy;
  });
  jest.mocked(createPool).mockReturnValue({
    ...connection(),
    getConnection: jest.fn().mockResolvedValue(c),
  } as never);
  const client = new MysqlPoolClient({});
  await expect(client.withTransaction(async () => 1)).rejects.toMatchObject({
    cause: begin,
    errors: [begin, destroy],
  });
  await client.release();
});

test("dedicated MySQL clients implement the managed discard policy by closing", async () => {
  const c = connection();
  jest.mocked(createConnection).mockResolvedValue(c as never);
  const client = new MysqlClient({});
  await expect(
    client.withTransaction(
      async (tx) => {
        await tx.rawQuery("SELECT 1");
        return 5;
      },
      { connection: "discard" },
    ),
  ).resolves.toBe(5);
  expect(c.commit).toHaveBeenCalledTimes(1);
  expect(c.end).toHaveBeenCalledTimes(1);
  expect(c.release).not.toHaveBeenCalled();
});
