# Prepared statement measurements and pool lifecycle

PS04 and S09 were measured on 2026-10-08 using Node 24.21.0, MySQL 8.4.11, and PostgreSQL 16.15 in the local development containers. These are small synthetic measurements, not production capacity estimates or performance guarantees.

## Reproduce

```sh
TEST_DB_HOST=db TEST_DB_PORT=3306 \
TEST_PG_HOST=postgres TEST_PG_PORT=5432 \
BENCH_ITERATIONS=100 BENCH_ROUNDS=3 \
yarn bench:prepared > measurements.jsonl
```

Run this separately from builds and tests. The same `TEST_DB_*` / `TEST_PG_*` credentials as the integration suites apply; no application database configuration is loaded. Both accounts need create/drop database privileges. The script creates UUID-named databases, seeds a 256-row table, and drops its databases in `finally`. It does not modify the application's database. A forcibly terminated process may leave its scratch database behind.

For each shape and mode, each round warms up with 20 operations, then measures 100 operations. Raw/bound execution order alternates between rounds. Output includes p50, p95, mean latency, and elapsed time per round. Timing includes DSL construction, compilation, driver execution and read row-count assertions. UPDATE always changes its value. Bulk workloads use upserts with changing labels. Timings cover neither GraphQL execution nor hydration; those are checked separately by regression tests.

The matrix covers fixed single-ID selects, IN lists of 1/4/16 IDs, updates, bulk writes of 8 rows, and bulk writes of 1/8/32 rows. It runs with a one-connection pool, one reserved transaction, and a four-connection pool (four concurrent reads; writes stay sequential to avoid overlapping-row lock contention). MySQL also runs with a new connection per operation. Transaction matrix timings exclude BEGIN/ROLLBACK and roll back the writes at the end. A separate 50-transaction probe includes acquisition, BEGIN, a connection-ID read, a bound select and COMMIT.

## Connection lifecycle result

| MySQL pool client: 50 sequential transactions | Before S09 | After S09 |
| --- | ---: | ---: |
| Distinct server connection IDs | 50 | 1 |
| Median transaction latency | 3.019 ms | 0.355 ms |
| p95 transaction latency | 7.142 ms | 0.674 ms |

The old transaction path created a dedicated connection for every transaction. The new path borrows from the same pool as ordinary queries. This removes repeated connection setup and allows connection-local prepared statements to survive successful transactions. PostgreSQL already borrowed from its pool and used one connection in both measurements.

The paired runs happened sequentially and local scheduling/storage noise remains. The connection-count change is deterministic evidence; the latency values should be remeasured with the application's own load.

These figures measure the manual transaction API. They do not measure the additional callback and SQL queue management in [withTransaction](transactions.md).

## Raw SQL versus bound SQL

The following are warm p50 values from the post-change run, in milliseconds. Each row combines three rounds of 100 operations per mode.

| Database | Connection mode | Shape | Raw | Bound |
| --- | --- | --- | ---: | ---: |
| mysql | pool-1 | select-one | 0.199 | 0.211 |
| mysql | pool-1 | in-variable | 0.188 | 0.221 |
| mysql | pool-1 | update | 1.024 | 1.074 |
| mysql | pool-1 | bulk-eight | 1.065 | 1.199 |
| mysql | pool-1 | bulk-variable | 1.185 | 1.293 |
| postgres | pool-1 | select-one | 0.206 | 0.238 |
| postgres | pool-1 | in-variable | 0.176 | 0.233 |
| postgres | pool-1 | update | 0.256 | 0.304 |
| postgres | pool-1 | bulk-eight | 0.362 | 0.408 |
| postgres | pool-1 | bulk-variable | 0.436 | 0.532 |

Parameter binding is not an unconditional speed improvement. These tiny queries can spend more time compiling, validating, converting parameters and exchanging protocol messages than they save on parsing. The compatibility casts that preserve numeric semantics also remain part of compiled SQL. Keep binding enabled for its value/text separation and correctness; tune based on actual workloads instead of switching execution modes on errors.

## MySQL cache behavior

A separate session-status probe records `Com_stmt_prepare`, `Com_stmt_execute` and `Com_stmt_close`. With a cache capacity of 64, 30 repetitions of one SQL shape required one prepare and 30 executes. The variable IN probe reused that one-ID shape and prepared the other two shapes once each. Variable bulk writes prepared three shapes once each.

With capacity 2, cycling through three IN shapes required 29 prepares for 30 executes (one shape was already cached), and variable bulk required 30 prepares. Eviction caused 28 and 30 closes respectively. SQL shape diversity therefore matters even when only bind values are intended to vary. Shape includes placeholder count, selected columns, and numeric cast types, among other SQL text differences.

mysql2 caches automatic `execute` statements per physical connection and exposes `maxPreparedStatements` to bound that cache. Applications can pass this option to `MysqlPoolClient`; Sasat keeps the driver default unchanged. Size it against observed shapes, pool size, and the server's prepared-statement budget. A connection that closes after every operation cannot retain a reusable cache. See the [mysql2 prepared statement contract](https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements).

## PostgreSQL decision

A driver-level probe on one physical connection compares unnamed and named execution of the same compiled SQL. Its timing excludes compilation; both modes check returned row counts. Names are stable hashes of SQL text with a bounded name length. `pg_prepared_statements` confirms three distinct named statements and their custom/generic plan counts.

| Shape | Unnamed p50 | Named p50 |
| --- | ---: | ---: |
| Single ID | 0.159 ms | 0.140 ms |
| IN with 1/4/16 IDs | 0.195 ms | 0.143 ms |

**Keep unnamed `query(text, values)` as the default.** This narrow probe shows savings of roughly 0.02–0.05 ms, but it does not establish gains for representative joins, skewed inputs, production concurrency or connection proxies. Automatically naming arbitrary generated SQL would also require a policy for per-connection statement growth and invalidation. Binding remains active without a name. Reconsider an explicit named-statement facility only with a demonstrated workload benefit and a bounded lifecycle. See the [node-postgres prepared statement documentation](https://node-postgres.com/features/queries#prepared-statements).

## Pool transaction contract

- MySQL `MysqlPoolClient.transaction()` and PostgreSQL `PostgresClient.transaction()` borrow from their respective ordinary-query pools. BEGIN, statements and completion use one reserved connection.
- MySQL `connectionLimit`, `waitForConnections` and `queueLimit` now govern transaction acquisition too. PostgreSQL uses `max` and `connectionTimeoutMillis`. MySQL's connection establishment timeout is not a timeout for waiting in the pool queue; configure admission control in the application if bounded waiting is required.
- Successful COMMIT/ROLLBACK returns the connection. A failed BEGIN/COMMIT/ROLLBACK or explicit `discard()` removes the pooled connection. Acquisition failures propagate without creating an extra connection or retrying the write.
- For managed completion, use `withTransaction(callback)`. Passing `{ connection: 'discard' }` to it or to the manual `transaction(options)` API destroys the connection after successful COMMIT/ROLLBACK too. This is useful for callbacks that change session state. See the [managed transaction contract](transactions.md).
- A statement failure leaves the transaction available for rollback. Finished transactions reject subsequent SQL; repeated completion/discard calls do not affect a later borrower. Commit failures can have an uncertain database outcome and are not automatically retried.
- `MysqlClient` retains its dedicated-connection behavior. Its transaction completion closes that connection.
- Use the transaction executor for all work inside the transaction. A call through the parent pool while its capacity is exhausted can wait for the very connection the transaction holds. Finish active work before releasing the pool.
- Raw SQL can still change session settings or acquire session locks. Callers must clean up such state before returning a session, or discard it. Pool release does not promise a full session reset.

Real database regression cases verify 12 concurrent transactions against a two-connection limit, commit/rollback isolation, reuse across transactions, MySQL statement-cache reuse, queue limits, immediate rejection or PostgreSQL acquisition timeout, recovery after acquisition failure, explicit discard, and MySQL server-terminated sessions. Unit cases cover injected BEGIN/COMMIT/ROLLBACK failures and calls through stale handles. Existing generated GraphQL, numeric precision, bulk atomicity, migration locks and custom string-only executor contracts are also exercised.
