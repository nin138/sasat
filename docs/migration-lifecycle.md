# Migration lifecycle and recovery

A migration exports a default class implementing `SasatMigration` from `sasat/migration`. `up(store)` and `down(store)` describe schema changes and queued SQL. Both may be asynchronous.

## Definition replay and application

| Operation | Definitions | Apply hooks | Managed database writes |
| --- | --- | --- | --- |
| Schema reconstruction | Applied `up` definitions | None | None |
| `generate`, `generate:test`, `generate:er` | Definitions needed for the target | None | None |
| `migrate --dry` | Applied definitions, then pending `up`/`down` | None | None |
| `migrate` | Applied definitions, then pending `up`/`down` | Pending migrations only | Queued SQL and history |

Generation writes its normal output files. Dry runs may compile adjacent `.mjs` files and read database history, but do not acquire the migration lock, create history, apply queued SQL, or generate output requested by `--generateFiles`. `--skipBuild` uses existing compiled files.

Definitions must be replayable. Put database changes in the store's queue or apply hooks. Import code, constructors, and `up`/`down` still execute during replay; Sasat does not sandbox their direct database, network, or filesystem operations. `skipOnTest` excludes queued SQL from test-SQL collection, not definition execution. Test-SQL generation does not include data inserted by hooks.

## Hook order

For each pending migration, Sasat awaits these steps in order:

1. Replay `up(store)` or `down(store)` to build the SQL queue.
2. Begin a transaction and call `beforeUp(context)` or `beforeDown(context)`.
3. Execute the queued SQL in order.
4. Call `afterUp(context)` or `afterDown(context)`.
5. Insert the successful migration history row and commit.
6. Call `afterCommitUp(context)` or `afterCommitDown(context)`.

Before/after hooks receive a `MigrationHookContext` with `migrationName`, `direction` (`"up"` or `"down"`), and `db`. Use `db.rawQuery` or `db.rawCommand` to share the migration's connection and transaction. After hooks can access tables just created by the queued SQL. They run **before commit**. Do not issue transaction-control SQL, change databases, or release the connection from a hook.

After-commit hooks receive a `MigrationCommitContext` with only `migrationName` and `direction`. Use them for external work that must start after successful commit. They do not receive the finished transaction. The lock session remains reserved until the hook finishes; if the hook needs separate database access, use a separate client with its own connection capacity. Querying the same exhausted pool from a hook can wait indefinitely. Hooks use the same migration instance as the corresponding definition and preserve `this`.

```ts
import type {
  MigrationCommitContext,
  MigrationHookContext,
  MigrationStore,
  SasatMigration,
} from 'sasat/migration';

export default class CreateStatus implements SasatMigration {
  up(store: MigrationStore) {
    store.createTable('status', (table) => {
      table.column('id').int().primary();
      table.column('name').varchar(64);
    });
  }

  down(store: MigrationStore) {
    store.dropTable('status');
  }

  async afterUp({ db }: MigrationHookContext) {
    await db.rawCommand("INSERT INTO status (id, name) VALUES (1, 'ready')");
  }

  async afterCommitUp({ migrationName }: MigrationCommitContext) {
    // Call your external notification service here. Make retries idempotent.
    console.log(`Committed ${migrationName}`);
  }
}
```

Use static SQL or the executor's SQL generator to escape dynamic values; never interpolate untrusted values directly into SQL.

## Failure and retry contract

| Failure | Result and recovery |
| --- | --- |
| Definition/import/constructor fails | No transaction for that migration starts. Earlier migrations remain applied. Correct the definition and rerun. |
| Before hook, SQL, after hook, or history write fails | Stop and attempt rollback. No successful history row is intentionally recorded for the failed migration. Inspect database state before retrying, especially with MySQL DDL. |
| Commit fails or connection is lost during commit | Outcome may be uncertain. No after-commit hook runs. Inspect actual schema, data, and history before retrying. |
| Rollback or lock cleanup also fails | Report the original and cleanup errors together. Inspect database state and connection availability before retrying. |
| After-commit hook fails | The command fails explicitly as already committed and stops before later migrations. Database changes and history remain. Rerunning `migrate` skips this applied migration; retry the external work separately. |

PostgreSQL supports transactional DDL for the table operations used here. MySQL statements such as `CREATE TABLE` cause implicit commits and cannot be undone by the later rollback. Earlier DML may also already be committed, and statements after that DDL can execute with autocommit enabled. The connection is shared, but atomicity across DDL, hooks, and history is not guaranteed. See the [MySQL implicit-commit rules](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).

For a failed MySQL migration that created a table, check the history and the actual table/data state. Back up any data that must be retained, then manually restore the pre-migration state or complete an explicitly reviewed repair before rerunning. Blindly retrying a non-idempotent `CREATE TABLE` will fail if the table remains. Sasat does not automatically repair partial DDL, infer completion from schema state, or insert a success history row after a failed hook.

External work is not exactly-once: a crash can happen after commit and before notification, or after a notification was delivered but before its hook returned. There is no durable notification retry queue. Use your own persistent delivery mechanism when required.

## Generation failure and recovery

`generate` and `migrate --generateFiles` prepare the following output before publishing any of it:

- The complete `migration.out/__generated__` directory.
- Missing extension files and additions to conditions, ID encoders, and middleware files. Existing user-owned files keep their normal preservation rules.
- `migration.dir/currentSchema.yml` and `migration.dir/test.migration.json`.

Sasat renders the files, checks the syntax of new or updated TypeScript, and writes staging files beside each destination. Only then does it replace destinations using renames. Old versions remain in temporary backups until all replacements succeed. Rendering, syntax-validation, and staging errors leave existing output untouched. If a replacement fails, Sasat attempts to restore every changed destination, including extension updates and schema/test-SQL files. A successful run also removes obsolete files from `__generated__`.

Existing POSIX file and directory modes are copied to replacement paths. Existing extension files that need no update are left untouched. Paths being replaced must be regular files or directories; symbolic-link targets are rejected. Ownership, ACLs, and extended attributes are not copied.

If restoration itself fails, the error lists the retained `.sasat-codegen-*` directories. Each affected directory can contain `previous` (the old artifact) and `next` (the new artifact). Preserve these directories, inspect the destinations, and restore the old artifacts before retrying. A failure to remove temporary files after successful publication produces a warning with the cleanup path; the published output stays in place.

This is recovery from ordinary errors, not a filesystem transaction across all paths. Readers may observe intermediate states during replacement. Process termination, power loss, concurrent generation, and edits made while generation runs are not covered. Stop watchers or servers that consume these files while generating, and run only one writer per output directory. TypeScript validation checks syntax, not project-wide types or GraphQL schema validity; run your application's checks afterward.

Generation failure does **not** undo applied database migrations or migration history. After fixing the cause, rerun `generate` to rebuild files for the intended target. Compiled migration `.mjs` files and arbitrary side effects inside migration definitions are outside file-publication recovery.

Application code and test SQL reuse one compilation per `generate` or `migrate --generateFiles` run; `migrate --skipBuild` uses existing compiled definitions for both. Definitions are still replayed separately for schema reconstruction and test SQL. Standalone `generate:test` compiles definitions and safely replaces only `test.migration.json`.

## Concurrent migrations

Normal CLI `migrate` acquires a database-scoped advisory lock **before compilation and history reads**. Another Sasat migration against that database fails immediately; rerun it after the first finishes. The lock covers all history-table names within that database and is held through hooks, commits, and the command's application-code and test-SQL generation.

The reserved database session runs each migration in a separate transaction; it does not require an additional pooled connection. PostgreSQL pools with `max: 1` are supported. The lock is released on success or failure. If releasing the lock is uncertain, the built-in connector discards the session rather than returning a possibly locked connection to the pool. Custom pooled transaction implementations must override `SQLTransaction.discard()` to destroy their session.

These are session locks: commit and rollback do not release them. See [PostgreSQL advisory locks](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS) and [MySQL locking functions](https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html). The lock coordinates Sasat CLI migrations on the same database server; it does not prevent manual SQL or other migration tools. Dry runs and standalone generation do not lock and may observe a database while another process is migrating. Use a direct/session-affine database connection; transaction-mode connection proxies cannot preserve this session lock contract.

## Upgrading existing migrations

This changes hook timing and replay behavior. Existing zero-argument hooks still type-check, but review their responsibilities:

- Move schema-building or instance initialization needed by `up`/`down` out of before/after hooks and into replayable definitions or constructors.
- Use the supplied `context.db` for database work in before/after hooks.
- Move external notifications that require successful commit to `afterCommitUp`/`afterCommitDown`.
- Move seed data needed by generated test databases into queued SQL, or seed it separately; hook effects are not collected into test SQL.
- Rebuild compiled migrations, especially when using `--skipBuild`. No migration-history schema conversion is required.

Previously, before/after hooks ran around definition replay, including reconstruction, generation, and dry runs. `afterUp` therefore ran before queued SQL. Under the new contract, only pending application runs invoke hooks; an already-applied migration's hooks are not replayed.
