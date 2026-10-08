import type {
  DBClient,
  QueryResponse,
  SQLTransaction,
} from "../../db/connectors/dbClient.js";
import type { DatabaseDialect } from "../../db/dialect.js";
import { createSqlGenerator } from "../../db/sqlGenerator.js";
import { withMigrationLock } from "./withMigrationLock.js";

function setup(dialect: DatabaseDialect = "postgres") {
  const session = {
    sql: createSqlGenerator(dialect),
    supportsParameterizedStatements: true,
    rawQuery: jest.fn(
      async (sql: string): Promise<QueryResponse> =>
        sql.includes("AS acquired")
          ? [{ acquired: true }]
          : sql.includes("AS released")
            ? [{ released: true }]
            : [],
    ),
    rawCommand: jest.fn(async () => ({
      insertId: 0,
      affectedRows: 1,
      changedRows: 1,
    })),
    rollback: jest.fn(async () => {}),
    discard: jest.fn(async () => {}),
  };
  const client = {
    dialect,
    transaction: jest.fn(async () => session as unknown as SQLTransaction),
  } as unknown as DBClient;
  return { session, client };
}

test.each(["postgres", "mysql"] as const)(
  "%s holds one session across separately committed migrations and unlocks",
  async (dialect) => {
    const { session, client } = setup(dialect);
    let scoped: DBClient | undefined;
    await expect(
      withMigrationLock(client, async (db) => {
        scoped = db;
        expect(db.sql).toBe(session.sql);
        expect(db.supportsParameterizedStatements).toBe(true);
        await db.rawQuery("history read");
        for (let i = 0; i < 2; i++) {
          const tx = await db.transaction();
          expect(tx.supportsParameterizedStatements).toBe(true);
          await tx.rawQuery("SQL");
          expect(await tx.rawCommand("DML")).toEqual({
            insertId: 0,
            affectedRows: 1,
            changedRows: 1,
          });
          await tx.commit();
          expect(() => tx.rawQuery("late")).toThrow("finished");
        }
        return 42;
      }),
    ).resolves.toBe(42);
    const queries = session.rawQuery.mock.calls.map(([sql]) => sql);
    expect(queries[0]).toContain(
      dialect === "postgres" ? "pg_try_advisory_lock" : "GET_LOCK",
    );
    expect(queries.slice(1, 9)).toEqual([
      "ROLLBACK",
      "history read",
      "BEGIN",
      "SQL",
      "COMMIT",
      "BEGIN",
      "SQL",
      "COMMIT",
    ]);
    expect(queries.at(-1)).toContain(
      dialect === "postgres" ? "pg_advisory_unlock" : "RELEASE_LOCK",
    );
    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(session.rollback).toHaveBeenCalledTimes(1);
    expect(session.discard).not.toHaveBeenCalled();
    expect(() => scoped!.rawQuery("late")).toThrow("released");
  },
);

test("contention prevents history reads and definitions", async () => {
  const { session, client } = setup();
  session.rawQuery.mockResolvedValueOnce([{ acquired: false }]);
  const apply = jest.fn();
  await expect(withMigrationLock(client, apply)).rejects.toThrow(
    "Another Sasat migration",
  );
  expect(apply).not.toHaveBeenCalled();
  expect(session.discard).toHaveBeenCalledTimes(1);
});

test("uncertain acquisition discards the session", async () => {
  const { session, client } = setup();
  session.rawQuery.mockRejectedValueOnce(new Error("connection lost"));
  await expect(withMigrationLock(client, jest.fn())).rejects.toThrow(
    "connection lost",
  );
  expect(session.discard).toHaveBeenCalledTimes(1);
});

test("failed apply clears the aborted transaction and unlocks", async () => {
  const { session, client } = setup();
  const original = new Error("apply failed");
  await expect(
    withMigrationLock(client, async (db) => {
      await db.transaction();
      throw original;
    }),
  ).rejects.toBe(original);
  expect(session.rawQuery.mock.calls.at(-2)).toEqual(["ROLLBACK"]);
  expect(session.rawQuery.mock.calls.at(-1)?.[0]).toContain("AS released");
  expect(session.rollback).toHaveBeenCalledTimes(1);
});

test("failed unlock discards the connection and preserves both failures", async () => {
  const { session, client } = setup();
  const original = new Error("apply failed");
  session.rawQuery.mockImplementation(async (sql) =>
    sql.includes("AS acquired")
      ? [{ acquired: true }]
      : sql.includes("AS released")
        ? [{ released: false }]
        : [],
  );
  await expect(
    withMigrationLock(client, async () => {
      throw original;
    }),
  ).rejects.toMatchObject({
    errors: [
      original,
      expect.objectContaining({
        message: "Could not release the database migration lock",
      }),
    ],
  });
  expect(session.discard).toHaveBeenCalledTimes(1);
  expect(session.rollback).not.toHaveBeenCalled();
});

test("rejects nested transactions and allows rollback after a failed commit", async () => {
  const { session, client } = setup();
  await withMigrationLock(client, async (db) => {
    const tx = await db.transaction();
    await expect(db.transaction()).rejects.toThrow("Nested");
    session.rawQuery.mockRejectedValueOnce(new Error("commit failed"));
    await expect(tx.commit()).rejects.toThrow("commit failed");
    await tx.rollback();
    await (await db.transaction()).commit();
  });
});

test.each([1, 1n])("accepts MySQL lock success as %s", async (value) => {
  const { session, client } = setup("mysql");
  session.rawQuery.mockImplementation(async (sql) =>
    sql.includes("AS acquired")
      ? [{ acquired: value }]
      : sql.includes("AS released")
        ? [{ released: value }]
        : [],
  );
  await withMigrationLock(client, async () => {});
  expect(session.discard).not.toHaveBeenCalled();
});
test.each([0, 0n])("recognizes MySQL lock contention as %s", async (value) => {
  const { session, client } = setup("mysql");
  session.rawQuery.mockResolvedValueOnce([{ acquired: value }]);
  await expect(withMigrationLock(client, jest.fn())).rejects.toThrow(
    "Another Sasat migration",
  );
});

test("forwards bound statements through the reserved migration session and rejects late calls", async () => {
  const { client, session } = setup();
  const executeQuery = jest.fn(async () => [{ id: 1 }]);
  const executeCommand = jest.fn(async () => ({
    insertId: 0,
    affectedRows: 1,
    changedRows: 1,
  }));
  Object.assign(session, { executeQuery, executeCommand });
  const statement = { text: "SELECT $1", values: [1] };
  let scoped!: DBClient;
  await withMigrationLock(client, async (db) => {
    scoped = db;
    await expect(db.executeQuery(statement)).resolves.toEqual([{ id: 1 }]);
    const tx = await db.transaction();
    await tx.executeQuery(statement);
    await expect(tx.executeCommand(statement)).resolves.toEqual({
      insertId: 0,
      affectedRows: 1,
      changedRows: 1,
    });
    await tx.commit();
    await expect(tx.executeQuery(statement)).rejects.toThrow("finished");
    await expect(tx.executeCommand(statement)).rejects.toThrow("finished");
  });
  await expect(scoped.executeQuery(statement)).rejects.toThrow("released");
  await expect(scoped.executeCommand(statement)).rejects.toThrow("released");
  expect(executeQuery.mock.calls).toHaveLength(2);
  expect(executeCommand).toHaveBeenCalledWith(statement);
});
