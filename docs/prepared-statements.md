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

## Compile a search query

Use `client.sql.compileQuery(query)` or `createSqlGenerator(dialect).compileQuery(query)` to compile the query AST without opening a connection:

```typescript
import { createSqlGenerator, qe } from 'sasat';

const sql = createSqlGenerator('postgres');
const statement = sql.compileQuery({
  select: [qe.field('u', 'id')],
  from: qe.table('users', [], 'u'),
  where: qe.eq(qe.field('u', 'name'), qe.value("O'Reilly")),
  limit: 10,
});
// text: SELECT "u"."id" FROM "users" AS "u" WHERE "u"."name"  = $1 LIMIT $2
// values: ["O'Reilly", "10"]
```

Each compile operation owns its bind array, shared by that query's joins and subqueries. Shared generators keep no bind state. SQL clauses are visited in placeholder order, including SELECT expressions and FROM subqueries. Comparisons, LIKE patterns, ranges, IN values, function arguments, pagination, and window frame values use parameters. Identifiers are escaped separately. Empty IN lists are false and empty NOT IN lists are true, including when the left expression is nullable.

LIMIT and OFFSET retain their non-negative safe-integer validation and are bound as decimal strings. Native SQL parameter limits still apply; the compiler does not split queries into batches. Raw expressions are trusted SQL and remain unchanged. They do not accept a separate bind list; use AST literals for dynamic values and avoid manually numbered placeholders in raw fragments.

The compiler includes SQL casts where driver parameter types would change numeric comparisons or computed result types. PostgreSQL numeric/boolean literals retain their SQL types, and COUNT/CONCAT/CONCAT_WS string or null arguments get explicit text types. MySQL integer and fixed-point numeric literals get corresponding casts rather than relying on mysql2's DOUBLE encoding. Different integer ranges and decimal scales can produce different SQL shapes.

For other PostgreSQL polymorphic functions, or when a Decimal string needs an explicit numeric context, use `qe.cast(value, sqlType)`:

```typescript
qe.fn('ABS', [qe.cast(qe.value('-1.25'), 'DECIMAL(10,2)')]);
```

`sqlType` is trusted, dialect-specific SQL syntax chosen by the application, like a function name or a raw expression. Never take it from user input. Cast expressions work in both compiled queries and the existing string renderer.

## Compatibility and rollout

Built-in connectors automatically use compiled statements for generated data-source searches, including `find`, `first`, `findPageable`, related-row reads, and mutation refetches. The parent limit and hydration behavior remain the same. Generated public API signatures do not change.

Mutation **writes** still use the string path. Existing `rawQuery(string)`, `rawCommand(string)`, tagged `query` / `command`, DDL generation, and `sql.query(query)` retain their existing behavior. Use the explicit execution or compilation APIs when writing low-level parameterized SQL.

`SQLExecutor` remains compatible with existing custom executors. Search execution checks `supportsParameterizedStatements`:

- Built-in clients, their transactions, and mocks set it to `true`. Reserved migration sessions inherit their underlying session's capability.
- A custom executor opts in with `supportsParameterizedStatements: true` and an `executeQuery(statement)` implementation that binds values natively. Advertising support without the method throws before any SQL is executed.
- Executors that omit the flag or set it to `false` continue to receive string SQL through `rawQuery`.
- A custom `SQLClient` subclass can implement protected `execStatement(statement, kind)` and override `get supportsParameterizedStatements() { return true; }` to enable automatic search binding. The inherited default is `false`, preserving subclasses that only implement `execSql`.

`ParameterizedSQLExecutor` describes the explicit query and command methods. The built-in capability is a prototype getter, so spreading a client into a plain object does not accidentally copy its opt-in flag without its methods. Wrappers that opt in must forward the capability and execution methods explicitly. Binding failures propagate; they never trigger a raw-SQL retry. Wrappers or monitoring code that previously intercepted only `rawQuery` should also intercept `executeQuery` to observe built-in searches.

The rollout is:

1. **Execution foundation (implemented):** statement/value types, validation, built-in connectors, transactions, migration sessions, mocks, and real database precision/failure tests.
2. **Search compilation (implemented):** per-query bind state, expressions/joins/subqueries, filters, paging, empty IN handling, and opt-in compatibility for custom executors. Built-in searches and refetches use this path.
3. **Mutation compilation:** compile insert/update/delete, bulk inserts and upserts, preserving DEFAULT, omitted fields, explicit null, authorization predicates, returned IDs, and selected fields on refetch.
4. **Regression and measurement:** complete generated GraphQL/TypeScript API coverage for both paths, retain DDL/dry-run compatibility, and compare query shapes, latency, and connection-local cache use. Coordinate pooled transaction changes with the separate connection-management work; decide on named PostgreSQL statements only after measurement.
