# Configuration, CLI, and migrations

[README](../README.md) · [Runtime customization](runtime.md) · [Application workflow](application-workflow.md)

## Loading configuration

Sasat merges defaults with `sasat.yml` in the current working directory on first use. The public `setConfig(partial)` API merges further updates into the shared process configuration.

| Setting | Default or purpose |
| --- | --- |
| `db.dialect` | `mysql` by default; set `postgres` for PostgreSQL |
| `db.host` / `db.port` | `127.0.0.1` / `3306` |
| `db.user` / `db.database` | `root` / `sasat` |
| `db.password` | Empty string by default |
| `db.ssl.ca` | Optional array of CA strings |
| `migration.dir` | `migrations` |
| `migration.table` | `__migrate__` |
| `migration.out` | `sasat` |
| `migration.target` | Optional exact migration filename, including `.ts` |
| `migration.db` | Optional connection override used by migration and generation commands |
| `testDB` | Connection settings for test-database creation; must use the application dialect |
| `generator.addJsExtToImportStatement` | Defaults to false; set true for the README's ESM example |

For PostgreSQL, explicitly set the port and user; the shared defaults remain MySQL-compatible. See [PostgreSQL configuration and SQL differences](postgresql.md).

A string starting with `$` is replaced with the environment variable named by the entire remaining string. `$DB_HOST` works; embedded substitutions such as `prefix-$NAME` are not supported. Missing variables become undefined, and environment values remain strings after substitution. The loader does not validate the full configuration at runtime, so check required variables and numeric settings.

If you use `.env`, load it through your application's startup tooling. Supply the connection settings to both the CLI and the server. Sasat itself does not automatically load this file.

## Database drivers

Install `mysql2` for `db.dialect: mysql` (the default), or `pg` for `db.dialect: postgres`. They are optional peer dependencies and are not installed automatically. The first database operation loads the selected driver; an absent driver produces an error with the installation command.

When upgrading from a release that included the drivers as dependencies, add the one you use to your application dependencies explicitly. `getDbClient()` still returns a client synchronously; pool creation is deferred until its first database operation. Calling `release()` before use does not load the driver.

## CLI commands

Run these commands from the application root containing `sasat.yml`.

| Command | Behavior |
| --- | --- |
| `yarn sasat init` | Create sasat.yml if it does not exist |
| `yarn sasat migration:create createUser` | Create a timestamped TypeScript migration |
| `yarn sasat migration:build` | Compile migration `.ts` files to adjacent `.mjs` files |
| `yarn sasat migrate` | Apply up/down migrations according to history and target |
| `yarn sasat migrate -g` | Apply migrations, then generate code, currentSchema, and test SQL |
| `yarn sasat generate` | Generate code, currentSchema, and test SQL from definitions |
| `yarn sasat generate:test` | Generate `migrations/test.migration.json` |
| `yarn sasat generate:er` | Write `out/__generated__/er-diagram.mermaid`; create the output directory first |
| `yarn sasat dump-db` | Convert the connected database schema to `migrations/initialSchema.yml` |

The paths in this table use the README's `migration.dir` and `migration.out` values. `dump-db` exports schema information, not data rows. Tables without primary keys are excluded. MySQL may exclude unsupported column types; PostgreSQL rejects unsupported types or expressions. See [PostgreSQL import boundaries](postgresql.md#schema-imports-and-boundaries).

<a id="dry-run"></a>

## Dry runs and failures

`migrate --dry` skips managed SQL execution, creation of the migration history table, and history writes. Adding `--generateFiles` does not generate application code, currentSchema, or test SQL during a dry run.

The command still compiles `.mjs` files and executes migration definitions and hooks to calculate the preview. Use `--skipBuild` when compiled files are already current. Direct database operations or file writes inside your own definitions and hooks are not suppressed. `--silent` suppresses normal progress and SQL output.

Sasat checks the history of up/down operations. It executes each migration through a transaction API, but this is not a guarantee that arbitrary DDL can be rolled back or that partially applied changes are recovered automatically.

## Migration lifecycle

- Export a default class with up/down methods. Both synchronous and asynchronous definitions are supported.
- Optional hooks are beforeUp, afterUp, beforeDown, and afterDown. In the current implementation, after hooks run after reading the definition, **before the queued SQL is applied**.
- Applied up definitions are replayed to reconstruct the schema. Generation and dry runs also execute hooks, so keep definitions replayable.
- `store.sql` adds custom SQL to the queue. Sasat does not infer schema changes from that SQL; use the schema APIs as well when code generation must reflect a change.
- `skipOnTest: true` excludes a migration's queued SQL from test-SQL collection. It does not skip execution of its definition or hooks.

File enumeration currently has no explicit sort. Also, migrate rejects an unknown target, while schema reconstruction for generation can fall back to the last file. Check the exact target when changing migration positions or rolling back.

## Regeneration

`__generated__` is cleared and recreated on each run. Generation does not restore previous output after a failure. Keep custom code in the extension files listed in the README.

For schema or API changes, update migration definitions and regenerate. Add custom resolvers in `out/schema.ts` and custom database operations in `out/dataSources/db/`. After a Sasat upgrade, manually incorporate required changes into files that are preserved during regeneration.

See [application workflow](application-workflow.md) for the sequence from a change to verification. Contributors changing generation behavior should update the generator and its tests; see the [contributor guide](development.md).
