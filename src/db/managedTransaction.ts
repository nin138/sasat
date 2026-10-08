import type {
  DBClient,
  SQLClient,
  SQLTransaction,
} from "./connectors/dbClient.js";
import { snapshotStatement } from "./sqlStatement.js";

export interface TransactionOptions {
  /** Discard after COMMIT/ROLLBACK when the callback changes session state. */
  readonly connection?: "reuse" | "discard";
}

/** SQL-only view: transaction completion belongs to withTransaction. */
export type TransactionExecutor = Pick<
  SQLClient,
  | "sql"
  | "dialect"
  | "supportsParameterizedStatements"
  | "rawQuery"
  | "rawCommand"
  | "executeQuery"
  | "executeCommand"
  | "query"
  | "command"
>;

export class TransactionCommitError extends Error {
  constructor(cause: unknown) {
    super(
      "Transaction commit failed; the database outcome may be unknown. Do not retry automatically.",
      { cause },
    );
    this.name = "TransactionCommitError";
  }
}

export function transactionConnectionPolicy(
  options?: TransactionOptions,
): "reuse" | "discard" {
  if (
    options !== undefined &&
    (!options || typeof options !== "object" || Array.isArray(options))
  )
    throw new Error("Invalid transaction options");
  const policy =
    options?.connection === undefined ? "reuse" : options.connection;
  if (policy !== "reuse" && policy !== "discard")
    throw new Error("Invalid transaction option: connection");
  return policy;
}

/** Keep both the primary operation failure and any cleanup failure. */
export async function finishAndRelease(
  action: () => Promise<void>,
  release: (failed: boolean) => void | Promise<void>,
): Promise<void> {
  let failure: { error: unknown } | undefined;
  try {
    await action();
  } catch (error) {
    failure = { error };
  }
  try {
    await release(!!failure);
  } catch (error) {
    if (failure)
      throw new AggregateError(
        [failure.error, error],
        "Transaction completion and connection cleanup failed",
        { cause: failure.error },
      );
    throw error;
  }
  if (failure) throw failure.error;
}

function transactionScope(transaction: SQLTransaction) {
  let closed = false;
  let failure: { error: unknown } | undefined;
  const pending = new Set<Promise<void>>();
  let tail = Promise.resolve();
  function invoke<T>(prepare: () => () => Promise<T>): Promise<T> {
    let operation: Promise<T>;
    try {
      if (closed) throw new Error("Transaction callback has already finished");
      if (failure) throw failure.error;
      const run = prepare();
      operation = tail.then(() => {
        if (failure) throw failure.error;
        return run();
      });
    } catch (error) {
      operation = Promise.reject(error);
    }
    const observed = operation.then(
      () => {
        pending.delete(observed);
      },
      (error) => {
        if (!closed || pending.has(observed)) failure ??= { error };
        pending.delete(observed);
      },
    );
    pending.add(observed);
    tail = observed;
    return operation;
  }
  const executor: TransactionExecutor = Object.freeze({
    sql: transaction.sql,
    dialect: transaction.dialect,
    supportsParameterizedStatements:
      transaction.supportsParameterizedStatements,
    rawQuery: (text: string) => invoke(() => () => transaction.rawQuery(text)),
    rawCommand: (text: string) =>
      invoke(() => () => transaction.rawCommand(text)),
    executeQuery: (statement: Parameters<SQLClient["executeQuery"]>[0]) =>
      invoke(() => {
        const snapshot = snapshotStatement(statement);
        return () => transaction.executeQuery(snapshot);
      }),
    executeCommand: (statement: Parameters<SQLClient["executeCommand"]>[0]) =>
      invoke(() => {
        const snapshot = snapshotStatement(statement);
        return () => transaction.executeCommand(snapshot);
      }),
    query: (...args: Parameters<SQLClient["query"]>) =>
      invoke(() => {
        const text = transaction.sql.format(...args);
        return () => transaction.rawQuery(text);
      }),
    command: (...args: Parameters<SQLClient["command"]>) =>
      invoke(() => {
        const text = transaction.sql.format(...args);
        return () => transaction.rawCommand(text);
      }),
  });
  return {
    executor,
    async close() {
      closed = true;
      if (pending.size > 0)
        failure ??= {
          error: new Error(
            "Transaction callback finished with pending SQL; await every operation",
          ),
        };
      // Never return a connection while SQL submitted by the callback is pending.
      await Promise.all([...pending]);
      return failure;
    },
  };
}

export async function runManagedTransaction<T>(
  client: DBClient,
  callback: (transaction: TransactionExecutor) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const connection = transactionConnectionPolicy(options);
  if (typeof callback !== "function")
    throw new Error("Transaction callback must be a function");
  if (connection === "discard" && !client.supportsTransactionConnectionPolicy)
    throw new Error(
      "This database client does not support transaction connection discard policy",
    );
  const transaction = await (connection === "discard"
    ? client.transaction({ connection })
    : client.transaction());
  const scope = transactionScope(transaction);
  let result: T | undefined;
  let failure: { error: unknown } | undefined;
  try {
    result = await callback(scope.executor);
  } catch (error) {
    failure = { error };
  }
  const sqlFailure = await scope.close();
  failure ??= sqlFailure;
  if (failure) {
    const errors = [failure.error];
    try {
      await transaction.rollback();
    } catch (error) {
      errors.push(error);
      try {
        await transaction.discard();
      } catch (discardError) {
        errors.push(discardError);
      }
    }
    if (errors.length > 1)
      throw new AggregateError(
        errors,
        "Transaction callback and cleanup failed",
        { cause: failure.error },
      );
    throw failure.error;
  }
  try {
    await transaction.commit();
  } catch (error) {
    const commitError = new TransactionCommitError(error);
    try {
      await transaction.discard();
    } catch (discardError) {
      throw new AggregateError(
        [commitError, discardError],
        "Transaction commit and cleanup failed",
        { cause: commitError },
      );
    }
    throw commitError;
  }
  return result as T;
}
