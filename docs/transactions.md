# Managed transactions

Use `client.withTransaction(callback, options?)` to run related operations on one connection. It commits when the callback succeeds and rolls back when the callback throws or any SQL operation fails. MySQL, PostgreSQL, and the mock client implement this API. The callback's result is returned only after successful completion and connection cleanup.

```typescript
import { getDbClient } from 'sasat';
import { UserDBDataSource } from './out/dataSources/db/User.js';

const client = getDbClient();
const user = await client.withTransaction(async (tx) => {
  const users = new UserDBDataSource(tx);
  return await users.create({ name: 'Alice' });
});
```

Adapt the generated import and input fields to your schema. Data sources accept the callback's executor, including automatic parameterized CRUD. You can also call `rawQuery`, `rawCommand`, `executeQuery`, `executeCommand`, or tagged `query` / `command`. `tx.sql` and `tx.dialect` belong to the reserved connection. The tagged methods retain their existing string-SQL behavior.

The exported `TransactionExecutor` type and the actual callback object expose SQL operations only. They do not expose commit, rollback, discard, release, or nested transaction acquisition. Completion is owned by `withTransaction`. Generated GraphQL mutations are not automatically wrapped by this helper; invoke it explicitly from application code when several operations must share a transaction.

## Callback contract

- Await all operations, including calls through data sources. Use `tx` for every database operation in the callback. Calling the parent client can run outside the transaction or wait indefinitely for capacity the transaction itself holds.
- Any SQL error makes this callback rollback-only, even if the callback catches it. Further SQL is rejected, and a successful callback return does not cause a commit. Use the manual API if you need an explicit recovery protocol such as savepoints.
- SQL calls submitted together with `Promise.all` are dispatched sequentially on the reserved connection. After the first failure, queued statements are rejected without being sent to the driver. This prevents a queued write from running after MySQL has automatically rolled back a deadlock victim.
- Values are snapshotted when a bound operation is submitted, including operations waiting behind other SQL. Mutating a caller-owned array, date, or buffer cannot change an already submitted statement.
- The executor closes when the callback settles. Later calls are rejected. If SQL is still pending, the helper stops queued work, waits for in-flight SQL, and rolls back with an error instead of returning the connection early. This is not a timeout or a guarantee that every missing `await` can be detected. Do not start detached timers or background work inside the callback.
- Do not issue transaction-control SQL (`BEGIN`, `COMMIT`, `ROLLBACK`, or changes to autocommit) through raw statements or stored procedures. The helper does not parse arbitrary SQL to enforce this rule. MySQL DDL and nontransactional storage engines can also prevent atomic rollback; use this API for transactional DML. See [MySQL implicit commits](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).

## Connection reuse or discard

`connection: 'reuse'` is the default. Normal completion returns a pooled connection and preserves its prepared-statement cache. It does not reset session variables, temporary tables, session locks or other connection state.

Choose `connection: 'discard'` **before the transaction starts** when the callback changes session state that must not reach another borrower:

```typescript
await mysqlClient.withTransaction(async (tx) => {
  await tx.rawCommand("SET SESSION time_zone = '+09:00'");
  // All database work that needs this session setting goes through tx.
}, { connection: 'discard' });
```

| Outcome | `reuse` | `discard` |
| --- | --- | --- |
| Callback succeeds | COMMIT, then return to pool | COMMIT, then destroy connection |
| Callback or SQL fails | ROLLBACK, then return to pool | ROLLBACK, then destroy connection |
| BEGIN / COMMIT / ROLLBACK fails | Destroy connection | Destroy connection |

The policy is captured before acquiring a connection. It is not implemented as `commit(); discard();`, because that would return the connection before discarding it. Successful writes remain committed in discard mode. Losing the connection also loses its prepared-statement cache, so use reuse for ordinary CRUD and discard for session-changing work. Dedicated `MysqlClient` connections close in either mode.

Sasat does not automatically identify session changes in arbitrary SQL. Discard does not undo global database settings, external effects, or already committed DDL. It prevents this connection's state from being reused; it does not clean a previously contaminated session before the callback starts.

## Failure reporting

If rollback succeeds, the helper rethrows the original callback error, or the first SQL error when the callback swallowed it. An exception can be any JavaScript value, including `undefined` or `null`. When rollback and subsequent discard also fail, an `AggregateError` retains the primary error followed by cleanup errors in `errors`, with the primary error in `cause`.

A commit failure becomes the exported `TransactionCommitError`, with the underlying failure in `cause`. It means the callback did not complete successfully; **do not infer that the database did not save the changes**. A connection failure can occur after the server committed. The helper discards the session and never retries the callback. A further discard failure is retained in an `AggregateError`.

MySQL deadlocks roll back the transaction; lock wait timeouts normally roll back just the failed statement. The managed helper rolls back the remaining transaction in either case. Retry policy belongs to the application and must account for side effects and idempotency. See [InnoDB error handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html).

## Manual API and custom clients

The existing API remains available:

```typescript
const tx = await client.transaction({ connection: 'discard' });
try {
  await tx.rawCommand('INSERT INTO audit_log(message) VALUES (\'example\')');
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

Calling `transaction()` without options retains its existing behavior. The rollback-only checks and SQL queue belong to the managed callback API; manual transactions retain application-controlled recovery. Callers of the manual API own all cleanup.

A custom `DBClient` subclass inherits `withTransaction` for its existing no-argument `transaction()` implementation. Parameterized SQL capability is forwarded from the returned transaction without automatically opting it in. To support the discard option, implement `transaction(options?: TransactionOptions)` with the lifecycle above and override `get supportsTransactionConnectionPolicy() { return true; }`. The default is false, and managed discard requests fail before acquisition on unsupported clients. The base `SQLTransaction.discard()` falls back to rollback for legacy compatibility; a pooled custom implementation must override it to actually destroy an unsafe connection.

Acquisition and execution timeouts/cancellation are not added by this helper. Existing pool capacity, queue and driver timeout settings still apply. A plain `Promise.race` does not cancel acquisition or SQL and can leave work running; do not use it as a connection cleanup mechanism. See [pool configuration and measurements](prepared-statements-performance.md#pool-transaction-contract).
