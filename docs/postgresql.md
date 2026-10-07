# PostgreSQL

[README](../README.md) · [Configuration](configuration.md) · [Runtime APIs](runtime.md)

Sasat supports PostgreSQL through the optional `pg` driver. Install it in your application with `yarn add pg`; `mysql2` is not required. The migration definitions, generated data sources, GraphQL queries, mutations, and subscriptions use the same APIs as MySQL. PostgreSQL 16 is covered by the live integration suite.

## Configure an application

Create an empty database with your PostgreSQL administration tools:

```sql
CREATE DATABASE sasat_example;
```

Set `DB_USER` and `DB_PASSWORD` in your environment, then use this `sasat.yml`:

```yaml
db:
  dialect: postgres
  host: 127.0.0.1
  port: 5432
  user: $DB_USER
  password: $DB_PASSWORD
  database: sasat_example
migration:
  dir: migrations
  table: __migrate__
  out: out
generator:
  addJsExtToImportStatement: true
```

Follow the README's installation, migration, and GraphQL server steps, replacing `mysql2` with `pg` in the installation command. Replace its MySQL database-creation statement and connection settings with the ones above:

```sh
yarn sasat migrate --dry
yarn sasat migrate --generateFiles
yarn tsx server.ts
```

Sasat loads the driver on the first database operation. If `pg` is missing, that operation rejects with an installation hint; importing Sasat or releasing an unused client does not require a driver. Sasat includes the connection option types in its declarations, so using Sasat does not require `@types/pg`. Install `@types/pg` yourself if your TypeScript application imports `pg` directly.

Omitting `db.dialect` selects MySQL. Port and user defaults remain `3306` and `root` for compatibility, so specify PostgreSQL settings explicitly. Sasat does not load `.env` automatically. `migration.db` can override connection settings for migration and generation commands; include `dialect: postgres` when selecting PostgreSQL there as well. Configure the application server for the same database engine.

Changing the dialect does not copy an existing MySQL database or convert custom SQL. Review migrations containing `store.sql`, raw conditions, driver-specific functions, or manual data operations before applying them to PostgreSQL.

## Supported behavior

| Area | PostgreSQL behavior |
| --- | --- |
| Connections | `getDbClient()` selects a PostgreSQL pool; `PostgresClient` is also exported for explicit injection |
| Transactions | BEGIN, statements, COMMIT, and ROLLBACK use one checked-out connection; finishing returns it to the pool |
| Generated queries | Quoted identifiers, conditions, joins, related entities, parent paging with related entities |
| Row locks | FOR UPDATE / FOR SHARE lock the root table; related rows are not implicitly locked |
| Inserts | Identity columns with RETURNING for generated IDs; a single empty entity can use DEFAULT VALUES |
| Upserts | ON CONFLICT with an explicit conflict target; primary key by default |
| Ignore | ON CONFLICT DO NOTHING skips unique conflicts; other constraint failures still fail |
| Migration schema | Tables, columns, primary/unique keys, single-column foreign keys, indexes, defaults, and column type changes |
| Timestamps | createdAt uses CURRENT_TIMESTAMP; updatedAt uses a Sasat-managed trigger and function |
| CLI | migrate, dry run, generate, generate:test, dump-db, and down migrations |
| Test databases | `makeTestDB()` creates an isolated PostgreSQL database and drops it on release |

The existing integer column methods map to PostgreSQL integer types: tinyint/smallint/year become smallint, mediumint/int become integer, and bigint remains bigint. `autoIncrement()` uses an identity column. `unsigned()` becomes a non-negative CHECK constraint; the upper bound remains that of the signed PostgreSQL type. Integer display widths are ignored, and ZEROFILL is rejected. datetime/timestamp map to timestamp without time zone. decimal maps to numeric, float to real, and double to double precision.

The timestamp trigger updates marked columns when row values change and the timestamp value is unchanged. CURRENT_TIMESTAMP is the transaction start time in PostgreSQL. Applications needing another timestamp policy can manage their own SQL.

PostgreSQL identity values come from a sequence. Explicitly inserting an ID does not advance that sequence, and rollbacks or conflict handling can leave gaps. Use generated IDs in normal inserts; reseed sequences after manual data imports when necessary. See [PostgreSQL identity columns](https://www.postgresql.org/docs/current/ddl-identity-columns.html) and [INSERT](https://www.postgresql.org/docs/current/sql-insert.html).

## Upserts and result values

Select the unique fields that define a conflict when they differ from the primary key:

```typescript
// Application field names; Sasat maps them to database columns.
await users.upsert(
  { email: 'alice@example.com', name: 'Alice' },
  ['name'],
  ['email'],
);
```

The conflict columns must match a primary key or unique constraint/index. The lower-level `create` and `createBulk` options accept `upsert: { updateColumns, conflictColumns }` using **database column names**. The third `upsert()` argument is optional; MySQL continues to use its ON DUPLICATE KEY behavior.

`affectedRows` is PostgreSQL's rowCount. `changedRows` is rowCount for UPDATE and zero for other commands. An UPDATE matching one row returns `changedRows: 1` even if the assigned values are unchanged; generated `noRefetch` mutations consequently return true in that case. `insertId` is populated from Sasat's RETURNING alias for single generated inserts. Bulk inserts do not return individual IDs. A skipped single insert with `ignore` has no returned ID and currently produces `insertId: 0`.

Dates and timestamps are returned as strings. Bigint values within JavaScript's safe integer range are numbers; larger values remain strings. Numeric/decimal values remain strings to avoid losing precision. The existing generated GraphQL Int and TypeScript numeric mappings do not fully represent these types; see [runtime limitations](runtime.md#limitations). Generated insert IDs must fit JavaScript's safe integer range; an out-of-range ID raises an error after the INSERT has executed. Use an explicit transaction if that error must roll back the write.

For direct `rawCommand()` inserts, add `RETURNING id AS "__sasat_insert_id"` when you need `insertId`, or use `rawQuery()` with your own RETURNING fields. See [node-postgres results](https://node-postgres.com/apis/result) and [transactions](https://node-postgres.com/features/transactions).

## Schema imports and boundaries

`yarn sasat dump-db` reads the connection's current schema into `migrations/initialSchema.yml`. It imports supported scalar columns, simple literal/current-time defaults, identities, primary/unique keys, ordinary indexes, and single-column foreign keys. Tables without a primary key are excluded. Unsupported types, default expressions, partial/expression/INCLUDE/NULLS NOT DISTINCT indexes, and composite or cross-schema foreign keys cause an error.

This file is a starting point for Sasat definitions, not a complete PostgreSQL backup. CHECK constraints, custom functions/triggers (including automatic timestamp behavior), sequence state, index tuning, and privileges are not reconstructed. Review an imported schema before regenerating a database from it. Native UUID, JSON/JSONB, arrays, enums, and timezone-aware column definitions are not yet exposed by the migration API.

Use PostgreSQL-compatible raw SQL. Identifiers and generated aliases must fit PostgreSQL's normal 63-byte identifier limit. Case sensitivity, collation, NULL ordering, and implicit casts follow PostgreSQL rules. Bulk rows must have matching field sets; multiple empty default-only rows are not supported in one bulk insert. Column type changes that require a USING expression need explicit migration SQL.

## Testing

Generate test SQL for the configured dialect before calling `makeTestDB()`:

```sh
yarn sasat generate:test
```

`testDB` inherits the application's dialect when omitted and must use the same engine. Regenerate `test.migration.json` after switching engines. The test account needs CREATE/DROP DATABASE permissions and access to the `postgres` maintenance database. Always call `await client.release()` after using a temporary database.

Contributors can run `yarn test:integration:postgres` against an isolated local server; see the [contributor guide](development.md#live-integration-tests).
