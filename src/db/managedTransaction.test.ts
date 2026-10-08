import {
  DBClient,
  type QueryResponse,
  SQLTransaction,
} from "./connectors/dbClient.js";
import {
  finishAndRelease,
  TransactionCommitError,
  type TransactionExecutor,
  type TransactionOptions,
} from "./managedTransaction.js";
import type { SqlStatement } from "./sqlStatement.js";

class Transaction extends SQLTransaction {
  override get supportsParameterizedStatements() {
    return true;
  }
  commit = jest.fn(async () => {});
  rollback = jest.fn(async () => {});
  discard = jest.fn(async () => {});
  execSql = jest.fn(async (_sql: string): Promise<QueryResponse> => []);
  execStatement = jest.fn(
    async (_statement: SqlStatement): Promise<QueryResponse> => [],
  );
}
class Client extends DBClient {
  // biome-ignore lint/complexity/noUselessConstructor: Expose the protected base constructor for the fixture.
  constructor() {
    super();
  }
  policySupport = false;
  override get supportsTransactionConnectionPolicy() {
    return this.policySupport;
  }
  tx = new Transaction();
  transaction = jest.fn(async (_options?: TransactionOptions) => this.tx);
  release = jest.fn(async () => {});
  execSql = jest.fn(async () => []);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("callback receives only SQL operations, returns its value, and closes its scope", async () => {
  const client = new Client();
  let retained!: TransactionExecutor;
  const result = await client.withTransaction(async (tx) => {
    retained = tx;
    expect(Object.isFrozen(tx)).toBe(true);
    for (const name of [
      "commit",
      "rollback",
      "discard",
      "transaction",
      "release",
    ])
      expect(tx).not.toHaveProperty(name);
    expect(tx.sql).toBe(client.tx.sql);
    await tx.rawQuery("SELECT 1");
    await tx.command`UPDATE t SET label=${"a'b"}`;
    await tx.executeQuery({ text: "SELECT ?", values: [3] });
    return { id: 7 };
  });
  expect(result).toEqual({ id: 7 });
  expect(client.transaction).toHaveBeenCalledWith();
  expect(client.tx.commit).toHaveBeenCalledTimes(1);
  expect(client.tx.rollback).not.toHaveBeenCalled();
  expect(client.tx.execSql.mock.calls.map((c) => c[0])).toEqual([
    "SELECT 1",
    "UPDATE t SET label='a\\'b'",
  ]);
  await expect(retained.rawQuery("late")).rejects.toThrow("already finished");
  await expect(
    retained.executeQuery({ text: "late", values: [] }),
  ).rejects.toThrow("already finished");
  expect(client.tx.execSql).toHaveBeenCalledTimes(2);
});

test.each([new Error("callback failure"), undefined, null])(
  "rolls back callback rejection without changing the original value (%p)",
  async (error) => {
    const client = new Client();
    await expect(
      client.withTransaction(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(client.tx.rollback).toHaveBeenCalledTimes(1);
    expect(client.tx.commit).not.toHaveBeenCalled();
  },
);

test("a swallowed SQL error makes the whole callback rollback-only", async () => {
  const client = new Client();
  const error = new Error("constraint");
  client.tx.execSql.mockRejectedValueOnce(error);
  await expect(
    client.withTransaction(async (tx) => {
      await tx.rawCommand("bad").catch(() => {});
      await expect(tx.rawQuery("must not execute")).rejects.toBe(error);
      return "success";
    }),
  ).rejects.toBe(error);
  expect(client.tx.execSql).toHaveBeenCalledTimes(1);
  expect(client.tx.commit).not.toHaveBeenCalled();
  expect(client.tx.rollback).toHaveBeenCalledTimes(1);
});

test("parallel submissions stop at the first failure instead of sending SQL after a deadlock", async () => {
  const client = new Client();
  const error = new Error("deadlock");
  client.tx.execSql.mockRejectedValueOnce(error);
  await expect(
    client.withTransaction(async (tx) => {
      await Promise.all([
        tx.rawCommand("deadlock"),
        tx.rawCommand("must not escape transaction"),
      ]);
    }),
  ).rejects.toBe(error);
  expect(client.tx.execSql).toHaveBeenCalledTimes(1);
  expect(client.tx.rollback).toHaveBeenCalledTimes(1);
});

test("invalid bind values and synchronous executor errors also force rollback", async () => {
  for (const sync of [false, true]) {
    const client = new Client();
    if (sync)
      client.tx.execSql.mockImplementation(() => {
        throw new Error("sync failure");
      });
    await expect(
      client.withTransaction(async (tx) => {
        try {
          if (sync) await tx.rawQuery("bad");
          else
            await tx.executeQuery({
              text: "SELECT ?",
              values: [undefined],
            } as unknown as SqlStatement);
        } catch {}
      }),
    ).rejects.toThrow(sync ? "sync failure" : "Invalid SQL parameter");
    expect(client.tx.commit).not.toHaveBeenCalled();
    expect(client.tx.rollback).toHaveBeenCalledTimes(1);
  }
});

test("queued bind values are snapshotted before the caller can mutate them", async () => {
  const client = new Client();
  const values = [Buffer.from("original"), new Date("2026-10-08T00:00:00Z")];
  await client.withTransaction(async (tx) => {
    const pending = tx.executeQuery({ text: "SELECT ?,?", values });
    (values[0] as Buffer).fill(0);
    (values[1] as Date).setUTCFullYear(1999);
    await pending;
  });
  expect(client.tx.execStatement.mock.calls[0][0].values).toEqual([
    Buffer.from("original"),
    new Date("2026-10-08T00:00:00Z"),
  ]);
});

test("unawaited SQL is drained before rollback, never before returning a connection", async () => {
  const client = new Client();
  const running = deferred<void>();
  const finish = deferred<QueryResponse>();
  const callbackDone = deferred<void>();
  client.tx.execSql.mockImplementation(() => {
    running.resolve();
    return finish.promise;
  });
  const result = client.withTransaction(async (tx) => {
    void tx.rawQuery("slow");
    await running.promise;
    callbackDone.resolve();
  });
  const rejected = expect(result).rejects.toThrow("pending SQL");
  await callbackDone.promise;
  await Promise.resolve();
  expect(client.tx.rollback).not.toHaveBeenCalled();
  expect(client.tx.commit).not.toHaveBeenCalled();
  finish.resolve([]);
  await rejected;
  expect(client.tx.rollback).toHaveBeenCalledTimes(1);
});

test("callback and cleanup failures retain all errors", async () => {
  const client = new Client();
  const original = new Error("work");
  const rollback = new Error("rollback");
  const discard = new Error("discard");
  client.tx.rollback.mockRejectedValue(rollback);
  client.tx.discard.mockRejectedValue(discard);
  await expect(
    client.withTransaction(async () => {
      throw original;
    }),
  ).rejects.toMatchObject({
    cause: original,
    errors: [original, rollback, discard],
  });
  expect(client.tx.commit).not.toHaveBeenCalled();
});

test("a commit failure is marked as uncertain, discarded, and never retried", async () => {
  const client = new Client();
  const original = new Error("connection lost");
  client.tx.commit.mockRejectedValue(original);
  const callback = jest.fn(async () => 42);
  await expect(client.withTransaction(callback)).rejects.toMatchObject({
    name: "TransactionCommitError",
    cause: original,
  });
  expect(callback).toHaveBeenCalledTimes(1);
  expect(client.tx.commit).toHaveBeenCalledTimes(1);
  expect(client.tx.discard).toHaveBeenCalledTimes(1);
  expect(client.tx.rollback).not.toHaveBeenCalled();
});

test("commit and discard errors both remain available", async () => {
  const client = new Client();
  const commit = new Error("commit");
  const discard = new Error("discard");
  client.tx.commit.mockRejectedValue(commit);
  client.tx.discard.mockRejectedValue(discard);
  try {
    await client.withTransaction(async () => 0);
    throw new Error("should reject");
  } catch (error) {
    expect(error).toBeInstanceOf(AggregateError);
    const errors = (error as AggregateError).errors;
    expect(errors[0]).toBeInstanceOf(TransactionCommitError);
    expect(errors[0].cause).toBe(commit);
    expect(errors[1]).toBe(discard);
  }
});

test("discard is explicit and rejected before acquisition on legacy clients", async () => {
  const client = new Client();
  const callback = jest.fn(async () => 1);
  await expect(
    client.withTransaction(callback, { connection: "discard" }),
  ).rejects.toThrow("does not support");
  expect(client.transaction).not.toHaveBeenCalled();
  expect(callback).not.toHaveBeenCalled();
  client.policySupport = true;
  await expect(
    client.withTransaction(callback, { connection: "discard" }),
  ).resolves.toBe(1);
  expect(client.transaction).toHaveBeenCalledWith({ connection: "discard" });
});

test.each([null, [], { connection: "secret" }, { connection: null }])(
  "invalid options fail before acquiring a connection (%p)",
  async (options) => {
    const client = new Client();
    await expect(
      client.withTransaction(
        async () => 0,
        options as unknown as TransactionOptions,
      ),
    ).rejects.toThrow("Invalid transaction");
    expect(client.transaction).not.toHaveBeenCalled();
  },
);

test("acquisition rejection never calls the callback or creates a second transaction", async () => {
  const client = new Client();
  const error = new Error("BEGIN failed");
  client.transaction.mockRejectedValue(error);
  const callback = jest.fn(async () => 1);
  await expect(client.withTransaction(callback)).rejects.toBe(error);
  expect(callback).not.toHaveBeenCalled();
  expect(client.transaction).toHaveBeenCalledTimes(1);
});

test("connector completion retains both the SQL and release errors", async () => {
  const original = new Error("commit");
  const cleanup = new Error("close");
  await expect(
    finishAndRelease(
      async () => {
        throw original;
      },
      () => {
        throw cleanup;
      },
    ),
  ).rejects.toMatchObject({ cause: original, errors: [original, cleanup] });
});

test("legacy transaction capability is forwarded without opting it into bound writes", async () => {
  const client = new Client();
  Object.defineProperty(client.tx, "supportsParameterizedStatements", {
    value: false,
  });
  await client.withTransaction(async (tx) => {
    expect(tx.supportsParameterizedStatements).toBe(false);
    await tx.rawCommand("INSERT INTO t VALUES (1)");
  });
  expect(client.tx.execSql).toHaveBeenCalledTimes(1);
  expect(client.tx.execStatement).not.toHaveBeenCalled();
});

test("invalid callbacks fail before connection acquisition", async () => {
  const client = new Client();
  await expect(client.withTransaction(undefined as never)).rejects.toThrow(
    "callback must be",
  );
  expect(client.transaction).not.toHaveBeenCalled();
});
