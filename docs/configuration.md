# Configuration, CLI, and migrations

[README](../README.md) · [Runtime customization](runtime.md) · [Application workflow](application-workflow.md)

## Loading configuration

Sasat merges defaults with `sasat.yml` in the current working directory on first use. The public `setConfig(partial)` API merges further updates into the shared process configuration. Both paths normalize and validate the documented settings before publishing the result.

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
| `generator.gql.subscription` | Defaults to true; set false and regenerate to disable subscriptions and mutation publishing |
| `generator.addJsExtToImportStatement` | Defaults to false; set true for the README's ESM example |

For PostgreSQL, explicitly set the port and user; the shared defaults remain MySQL-compatible. See [PostgreSQL configuration and SQL differences](postgresql.md).

In YAML, a string starting with `# Configuration, CLI, and migrations

[README](../README.md) · [Runtime customization](runtime.md) · [Application workflow](application-workflow.md)

## Loading configuration

Sasat merges defaults with `sasat.yml` in the current working directory on first use. The public `setConfig(partial)` API merges further updates into the shared process configuration. Both paths normalize and validate the documented settings before publishing the result.

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
| `generator.gql.subscription` | Defaults to true; set false and regenerate to disable subscriptions and mutation publishing |
| `generator.addJsExtToImportStatement` | Defaults to false; set true for the README's ESM example |

For PostgreSQL, explicitly set the port and user; the shared defaults remain MySQL-compatible. See [PostgreSQL configuration and SQL differences](postgresql.md).

 is replaced with the environment variable named by the entire remaining string. `$DB_HOST` works; embedded substitutions such as `prefix-$NAME` are not supported. An explicit reference to an undefined variable is an error, including for optional settings such as password. Omit an optional setting when it is not needed. A defined empty password is allowed.

Only settings with numeric or boolean types are converted: port accepts decimal digit strings, and boolean flags accept exactly `"true"` or `"false"`. Passwords, hosts, names, and paths remain strings. `setConfig` does not expand environment references; a password starting with `# Configuration, CLI, and migrations

[README](../README.md) · [Runtime customization](runtime.md) · [Application workflow](application-workflow.md)

## Loading configuration

Sasat merges defaults with `sasat.yml` in the current working directory on first use. The public `setConfig(partial)` API merges further updates into the shared process configuration. Both paths normalize and validate the documented settings before publishing the result.

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
| `generator.gql.subscription` | Defaults to true; set false and regenerate to disable subscriptions and mutation publishing |
| `generator.addJsExtToImportStatement` | Defaults to false; set true for the README's ESM example |

For PostgreSQL, explicitly set the port and user; the shared defaults remain MySQL-compatible. See [PostgreSQL configuration and SQL differences](postgresql.md).

 remains literal there.

If you use `.env`, load it through your application's startup tooling. Supply the connection settings to both the CLI and the server. Sasat itself does not automatically load this file.

## Validation and partial updates

| Setting | Accepted values |
| --- | --- |
| `db.host`, `db.user`, `db.database` | Non-empty strings; whitespace-only values are rejected |
| `db.port` | Integer from 1 through 65535; decimal digit strings are normalized to numbers |
| `db.dialect` | `mysql`, `postgres`, or omitted |
| `db.password` | String, including empty, or omitted |
| `db.ssl` / `db.ssl.ca` | Optional object / optional array of non-empty strings |
| `migration.table`, `migration.dir`, `migration.out` | Non-empty strings |
| `migration.target` | Non-empty string or omitted |
| Generator flags | Boolean or exactly `"true"` / `"false"` |

The same database rules apply to `testDB` and `migration.db`. These blocks may be omitted. When supplied, missing connection properties are filled from the main `db` settings; existing override values are retained on subsequent updates. Changing dialect does not automatically choose a different port or user.

Absent settings keep defaults or the current value. Explicit `undefined` can clear an optional setting through `setConfig`; it is rejected for required settings. `null` is not an omission. Nested sections must be objects. Use `{}` or omit the file to use defaults; empty or malformed YAML is rejected. CA arrays keep the existing append behavior during partial updates; inheritance into an optional database block does not duplicate them.

Additional driver/extension options such as `connectionLimit` are preserved for compatibility, but their types and ranges are outside Sasat's documented schema and are not validated here. Errors within extension data use a wildcard path such as `db.*` to avoid echoing arbitrary input keys.

A failed `setConfig` leaves the current configuration unchanged. A successful call publishes a detached object; previously held references remain snapshots. Use the object returned by the latest `setConfig` call. Directly mutating that object bypasses validation; use another `setConfig` call for further changes.

Errors identify the setting and rule, for example:

`Invalid configuration: db.port must be an integer between 1 and 65535`

Errors do not include the rejected value, environment variable contents, or YAML source snippets. Parse/read failures identify `sasat.yml` instead of an individual setting. Invalid configuration is rejected before normal CLI database or generation work.

**Upgrade:** unresolved environment references and values previously passed through to drivers may now fail at configuration loading. Supply the missing variables, omit unused optional settings, and fix invalid types/ranges. No generated-code regeneration is required for this change.

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

Migrations run in lexicographic filename order; use zero-padded numbers or timestamps consistently. An unknown explicit target is rejected before compilation or generation writes files, including generate, generate:er, and generate:test. An omitted target selects the last migration; an empty directory with no target represents the initial schema. Existing database history must match filename order, otherwise migration stops without rewriting that history.

## Regeneration

`__generated__` is cleared and recreated on each run. Generation does not restore previous output after a failure. Keep custom code in the extension files listed in the README.

For schema or API changes, update migration definitions and regenerate. Add custom resolvers in `out/schema.ts` and custom database operations in `out/dataSources/db/`. After a Sasat upgrade, manually incorporate required changes into files that are preserved during regeneration.

See [application workflow](application-workflow.md) for the sequence from a change to verification. Contributors changing generation behavior should update the generator and its tests; see the [contributor guide](development.md).
