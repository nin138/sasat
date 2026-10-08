import { config } from "../config/config.js";
import { MysqlClient } from "./connectors/mysql/client.js";
import { MysqlPoolClient } from "./connectors/mysql/poolClient.js";
import { PostgresClient } from "./connectors/postgres/client.js";
import type { MysqlDriver, PostgresDriver } from "./drivers.js";
import { getDbClient } from "./getDbClient.js";
import { loadDriver } from "./loadDriver.js";

jest.mock("./loadDriver.js", () => ({
  loadDriver: jest.fn(() => {
    throw new Error("Unexpected runtime driver import");
  }),
}));
const original = structuredClone(config());
afterEach(() => {
  Object.assign(config(), structuredClone(original));
});

function mysqlFixture() {
  const connection = {
    query: jest.fn().mockResolvedValue([[{ value: 1 }], []]),
    execute: jest.fn().mockResolvedValue([[{ value: 1 }], []]),
    end: jest.fn(),
  };
  const driver = {
    createConnection: jest.fn().mockResolvedValue(connection),
    createPool: jest.fn().mockReturnValue(connection),
  } as unknown as MysqlDriver;
  return { driver, connection };
}
function pgFixture() {
  const pool = {
    query: jest.fn().mockResolvedValue({ rows: [{ value: 1 }] }),
    end: jest.fn(),
    on: jest.fn(),
  };
  const driver = {
    Pool: jest.fn().mockReturnValue(pool),
    types: { getTypeParser: jest.fn() },
  } as unknown as PostgresDriver;
  return { driver, pool };
}

test.each([MysqlClient, MysqlPoolClient])(
  "uses the injected MySQL driver for %p without importing a module",
  async (Client) => {
    const { driver, connection } = mysqlFixture();
    const client = new Client({}, undefined, driver);
    await expect(client.rawQuery("SELECT 1")).resolves.toEqual([{ value: 1 }]);
    await expect(
      client.executeQuery({ text: "SELECT ?", values: [1] }),
    ).resolves.toEqual([{ value: 1 }]);
    await client.release();
    expect(connection.end).toHaveBeenCalled();
    expect(loadDriver).not.toHaveBeenCalled();
  },
);

test("uses the injected PostgreSQL driver for queries and type parsers", async () => {
  const { driver, pool } = pgFixture();
  const client = new PostgresClient({}, undefined, driver);
  await expect(client.rawQuery("SELECT 1")).resolves.toEqual([{ value: 1 }]);
  await client.executeQuery({ text: "SELECT $1", values: [1] });
  expect(pool.query).toHaveBeenLastCalledWith("SELECT $1", [1]);
  const options = jest.mocked(driver.Pool).mock.calls[0][0]!;
  expect(options.types!.getTypeParser(20)("9007199254740993")).toBe(
    9007199254740993n,
  );
  await client.release();
  expect(pool.end).toHaveBeenCalledTimes(1);
  expect(loadDriver).not.toHaveBeenCalled();
});

test.each(["mysql", "postgres"] as const)(
  "shares an injected %s pool and rejects replacing its driver while active",
  async (dialect) => {
    config().db.dialect = dialect;
    const selection =
      dialect === "mysql"
        ? { dialect, driver: mysqlFixture().driver }
        : { dialect, driver: pgFixture().driver };
    const client = getDbClient(undefined, undefined, selection);
    try {
      expect(getDbClient()).toBe(client);
      expect(getDbClient(undefined, undefined, { ...selection })).toBe(client);
      await expect(getDbClient().rawQuery("SELECT 1")).resolves.toEqual([
        { value: 1 },
      ]);
      expect(() =>
        getDbClient(undefined, undefined, {
          ...selection,
          driver: { ...selection.driver },
        } as typeof selection),
      ).toThrow("different settings");
      expect(loadDriver).not.toHaveBeenCalled();
    } finally {
      await client.release();
    }
    const replacement = getDbClient(undefined, undefined, selection);
    expect(replacement).not.toBe(client);
    await replacement.release();
  },
);

test("rejects a driver for the wrong configured dialect", () => {
  config().db.dialect = "mysql";
  expect(() =>
    getDbClient(undefined, undefined, {
      dialect: "postgres",
      driver: pgFixture().driver,
    }),
  ).toThrow("does not match db.dialect");
  expect(loadDriver).not.toHaveBeenCalled();
});

test("requires initialization with the driver before the default shared client is created", async () => {
  config().db.dialect = "mysql";
  const client = getDbClient();
  try {
    expect(() =>
      getDbClient(undefined, undefined, {
        dialect: "mysql",
        driver: mysqlFixture().driver,
      }),
    ).toThrow("different settings");
  } finally {
    await client.release();
  }
  expect(loadDriver).not.toHaveBeenCalled();
});
