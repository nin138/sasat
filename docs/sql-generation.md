# SQL generation and connections

[README](../README.md) · [Runtime APIs](runtime.md) · [PostgreSQL](postgresql.md)

Each built-in database client owns an immutable `SqlGenerator` at `client.sql`. Its dialect is fixed by the connector: MySQL clients use MySQL SQL, and `PostgresClient` uses PostgreSQL SQL. Transactions share their parent client's generator. Changing `db.dialect` later does not change an existing client's SQL.

`db.dialect` still selects the connector used by `getDbClient()`. It also supplies the default for standalone helpers. Data sources use their injected client's generator for inserts, updates, deletes, queries, nested queries, and paging. Migration execution and test SQL generation pass the same generator into schema reconstruction and DDL generation.

## Generate SQL without a database

Generators do not open connections or load `mysql2` or `pg`. Choose an explicit dialect when generating SQL for more than one engine:

```typescript
import { createSqlGenerator, qe, queryToSql } from 'sasat';

const postgres = createSqlGenerator('postgres');
const mysql = createSqlGenerator('mysql');
const query = {
  select: [qe.field('users', 'id')],
  from: qe.table('users', [], 'users'),
};

postgres.query(query);       // SELECT "users"."id" FROM "users"
mysql.query(query);          // SELECT `users`.`id` FROM `users`
queryToSql(query, postgres); // Same output as postgres.query(query)
```

The generator also provides `escape`, `escapeId`, `format`, `create`, `update`, `delete`, `column`, `reference`, `createTable`, and index/alteration methods. Their arguments use Sasat's query and serialized schema types. Query factories such as `qe.field` construct an engine-independent AST; the generator converts it into SQL.

`createSqlGenerator()` without an argument, `queryToSql(query)`, `SqlString`, `Sql`, and `formatQuery` continue to use the current `db.dialect`, defaulting to MySQL. An explicitly created generator retains its dialect and can be reused across asynchronous operations. Factory-created generators are shared by dialect and have no per-query state.

## Use a connection's generator

```typescript
import { PostgresClient } from 'sasat';

const client = new PostgresClient({
  host: 'localhost',
  database: 'app',
});

try {
  const table = 'users';
  const id = 42;
  const rows = await client.query`SELECT * FROM ${() =>
    client.sql.escapeId(table)} WHERE id = ${id}`;
  console.log(rows);

  const transaction = await client.transaction();
  try {
    // transaction.sql === client.sql
    await transaction.query`SELECT ${'example'}`;
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
} finally {
  await client.release();
}
```

Normal template values are escaped by the connection's generator. Function substitutions insert raw SQL; explicitly use that generator when building identifiers or SQL fragments. Raw strings and raw AST expressions are passed through unchanged.

Generated data-source CRUD methods and constructors keep their existing signatures. Custom executors can provide `sql: createSqlGenerator('postgres')` alongside `rawQuery` and `rawCommand`. For compatibility, executors with only a `dialect` property still work; if both are omitted, the data source captures the configured dialect at construction.

## Migrating from scoped dialects

`withDialect(dialect, callback)` has been removed. SQL generation no longer uses `AsyncLocalStorage` or an ambient dialect scope. Replace scoped helper calls with an explicit generator:

```typescript
// Previously:
// withDialect('postgres', () => queryToSql(query));

const sql = createSqlGenerator('postgres');
sql.query(query);
```

Use `client.sql.escapeId(...)` instead of a config-based `SqlString.escapeId(...)` inside connection-specific raw callbacks. Custom relation conditions should use the query AST where possible, or explicitly capture the intended generator when constructing raw expressions. Existing raw SQL is not converted between engines.

For repository contributors, `StoreMigrator.new(generator)`, `StoreMigrator.deserialize(schema, generator)`, and `new DataStoreHandler(schema, generator)` support offline schema/DDL generation. Omitted arguments capture the configured dialect once when the store is created. Built-in migration execution supplies the client's generator, including during dry runs. Dry runs still follow the [documented migration and hook behavior](configuration.md#dry-run).
