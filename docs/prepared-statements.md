# Parameterized SQL and prepared statements

[README](../README.md) · [SQL generation](sql-generation.md) · [Numeric types](numeric-types.md)

Sasat's built-in clients and transactions provide `executeQuery(statement)` and `executeCommand(statement)`. A `SqlStatement` separates trusted SQL text from bind values:

```typescript
import { PostgresClient, type SqlStatement } from 'sasat';

const client = new PostgresClient({ database: 'app' });
try {
  const statement: SqlStatement = {
    text: 'SELECT id, name FROM users WHERE name = $1',
    values: ["O'Reilly"],
  };
  const rows = await client.executeQuery(statement);
} finally {
  await client.release();
}
```

For MySQL, use `?` placeholders instead of `$1`, `$2`, etc. With `getDbClient()`, choose SQL for `client.dialect`. SQL text is not translated between dialects. Identifiers still require `client.sql.escapeId(...)`; they cannot be bind values. Keep user input in `values`, not in SQL text.

## Execution contract

- `executeQuery` returns `QueryResponse`; `executeCommand` returns `CommandResponse` with `insertId`, `affectedRows`, and `changedRows`.
- PostgreSQL inserts need `RETURNING id AS __sasat_insert_id` to populate `insertId`, just as with `rawCommand`.
- Both methods work inside transactions and migration apply hooks using the existing reserved connection. Mock clients return empty rows or a command response with zero counts.
- Values may be strings, finite numbers, bigint, booleans, `null`, valid `Date` instances, or Node.js `Buffer` instances. Decimal values should be strings. Use bigint for integers outside JavaScript's safe integer range. Bigints are sent as exact decimal strings; database BIGINT columns are still returned as bigint, and DECIMAL columns as strings with the built-in defaults.
- `undefined`, functions, arrays, arbitrary objects, invalid dates, and non-finite numbers are rejected before execution. Validation errors identify the zero-based parameter index and omit its value. Use `null` explicitly. Serialize JSON yourself when targeting a supported database column.
- SQL and values are captured at method invocation, including copies of dates and buffers. Subsequent caller mutations do not change the pending execution. Date serialization follows the driver's connection/timezone settings.
- Logger callbacks receive SQL text containing placeholders, without bind values. Database/driver errors are propagated; they can contain database-supplied details.
- One placeholder represents one scalar value. Build `IN` lists with one placeholder per item. `DEFAULT`, omitted fields, expressions, and identifiers belong in SQL structure. This API does not parse or rewrite SQL or validate placeholder counts; the driver/database checks SQL validity.

MySQL uses [mysql2 `execute`](https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements), with its connection-local prepared statement cache. PostgreSQL uses [node-postgres `query(text, values)`](https://node-postgres.com/features/queries), without a statement name. Named PostgreSQL statement caching has not been enabled. Connection reuse, statement shape, and preparation cost affect performance; this change does not establish a speed improvement.

## Compatibility and rollout

The current release stage adds an explicit execution API. Existing `rawQuery(string)`, `rawCommand(string)`, tagged `query` / `command`, and string SQL generation retain their existing behavior. Generated data-source searches and mutations still use the string execution path. Adding this API does not automatically parameterize those calls.

`SQLExecutor` remains compatible with existing custom executors. `ParameterizedSQLExecutor` describes the additional methods. A custom `SQLClient` subclass may implement protected `execStatement(statement, kind)` to enable them; `kind` is `query` or `command`. A subclass implementing only the old `execSql` method continues to support existing calls, and explicitly rejects the new methods. There is no fallback that interpolates bind values into SQL strings.

The planned rollout is:

1. **Execution foundation (implemented):** statement/value types, validation, built-in connectors, transactions, migration sessions, mocks, and real database precision/failure tests.
2. **Search compilation:** create per-query bind state; compile query expressions, joins, subqueries, filters, paging, and `IN` lists into `{ text, values }`. Keep shared `SqlGenerator` instances stateless and preserve string generation for compatibility. Define how custom executors opt into the new path.
3. **Mutation compilation:** compile insert/update/delete, bulk inserts and upserts, preserving `DEFAULT`, omitted fields, explicit `null`, authorization predicates, returned IDs, and selected fields on refetch. Move generated runtime execution onto the compiled path without changing generated public API signatures.
4. **Regression and measurement:** exercise generated GraphQL/TypeScript APIs on both databases, retain DDL/dry-run compatibility, compare query shapes, latency, and connection-local cache use. Coordinate pooled transaction changes with the separate connection-management work; decide on named PostgreSQL statements only after measurement.
