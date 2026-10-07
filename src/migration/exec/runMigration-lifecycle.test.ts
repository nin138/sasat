import { Console } from "../../cli/console.js";
import type { DBClient } from "../../db/connectors/dbClient.js";
import { createSqlGenerator } from "../../db/sqlGenerator.js";
import type {
  MigrationHookContext,
  SasatMigration,
} from "../front/migration.js";
import { StoreMigrator } from "../front/storeMigrator.js";
import { Direction } from "./getCurrentMigration.js";
import { MigrationPostCommitError, runMigration } from "./runMigration.js";

const options = {
  dry: false,
  silent: true,
  skipBuild: true,
  generateFiles: false,
};
function setup(direction = Direction.Up) {
  const events: string[] = [];
  const tx = {
    sql: createSqlGenerator("postgres"),
    rawQuery: jest.fn(async () => {
      events.push("sql");
      return [];
    }),
    query: jest.fn(async () => {
      events.push("history");
      return [];
    }),
    commit: jest.fn(async () => {
      events.push("commit");
    }),
    rollback: jest.fn(async () => {
      events.push("rollback");
    }),
  };
  const client = {
    transaction: jest.fn(async () => {
      events.push("begin");
      return tx;
    }),
  };
  const contexts: MigrationHookContext[] = [];
  const migration: SasatMigration = {
    up() {},
    down() {},
    async beforeUp(context) {
      await Promise.resolve();
      contexts.push(context);
      events.push("beforeUp");
    },
    async afterUp(context) {
      await Promise.resolve();
      contexts.push(context);
      events.push("afterUp");
    },
    async beforeDown(context) {
      await Promise.resolve();
      contexts.push(context);
      events.push("beforeDown");
    },
    async afterDown(context) {
      await Promise.resolve();
      contexts.push(context);
      events.push("afterDown");
    },
    async afterCommitUp(context) {
      expect(context).toEqual({ migrationName: "001.ts", direction });
      events.push("afterCommitUp");
    },
    async afterCommitDown(context) {
      expect(context).toEqual({ migrationName: "001.ts", direction });
      events.push("afterCommitDown");
    },
  };
  const store = StoreMigrator.deserialize({ tables: [] });
  store.sql("SELECT 1");
  const run = (dry = false) =>
    runMigration(
      client as unknown as DBClient,
      store,
      "001.ts",
      direction,
      { ...options, dry },
      migration,
    );
  return { events, tx, client, contexts, migration, run };
}

test.each([Direction.Up, Direction.Down])(
  "awaits %s hooks around SQL and commit on the same executor",
  async (direction) => {
    const { run, events, contexts, tx } = setup(direction);
    await run();
    const suffix = direction === Direction.Up ? "Up" : "Down";
    expect(events).toEqual([
      "begin",
      `before${suffix}`,
      "sql",
      `after${suffix}`,
      "history",
      "commit",
      `afterCommit${suffix}`,
    ]);
    expect(contexts).toHaveLength(2);
    expect(contexts[0]).toBe(contexts[1]);
    expect(contexts[0]).toEqual({ db: tx, direction, migrationName: "001.ts" });
  },
);

test("dry run creates no transaction and invokes no hook", async () => {
  const { run, events } = setup();
  await run(true);
  expect(events).toEqual([]);
});

test.each(["beforeUp", "afterUp", "beforeDown", "afterDown"] as const)(
  "%s failure rolls back without history or commit",
  async (hook) => {
    const { run, tx, migration, events } = setup(
      hook.endsWith("Down") ? Direction.Down : Direction.Up,
    );
    migration[hook] = async () => {
      throw new Error("hook failed");
    };
    await expect(run()).rejects.toThrow("hook failed");
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(tx.query).not.toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
    expect(events.some((event) => event.startsWith("afterCommit"))).toBe(false);
  },
);

test.each(["rawQuery", "query", "commit"] as const)(
  "%s failure rolls back without afterCommit",
  async (method) => {
    jest.spyOn(Console, "error").mockImplementation(() => {});
    const { run, tx, events } = setup();
    tx[method].mockRejectedValueOnce(new Error("failed"));
    await expect(run()).rejects.toThrow("failed");
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(events).not.toContain("afterCommitUp");
  },
);

test.each([Direction.Up, Direction.Down])(
  "afterCommit %s failure reports committed and does not roll back",
  async (direction) => {
    const { run, tx, migration } = setup(direction);
    const error = new Error("notification failed");
    const hook = async () => {
      throw error;
    };
    migration.afterCommitUp = hook;
    migration.afterCommitDown = hook;
    await expect(run()).rejects.toMatchObject({
      name: "MigrationPostCommitError",
      committed: true,
      cause: error,
    });
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(tx.rollback).not.toHaveBeenCalled();
    expect(
      new MigrationPostCommitError("001.ts", direction, error).message,
    ).toContain("history are retained");
  },
);

test("rollback failure retains both original and cleanup errors", async () => {
  const { run, tx, migration } = setup();
  const original = new Error("before failed");
  const cleanup = new Error("rollback failed");
  migration.beforeUp = () => {
    throw original;
  };
  tx.rollback.mockRejectedValueOnce(cleanup);
  await expect(run()).rejects.toMatchObject({ errors: [original, cleanup] });
});
