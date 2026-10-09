# Deploy migrations as a single file

Build a migration executable on a machine with Sasat and the selected database driver installed, then deploy that file and your runtime configuration. The destination needs Node.js 22 or later and database access. It does not need `node_modules`, Sasat, TypeScript, esbuild, the migration sources, or their compiled `.mjs` files.

## Build

```sh
# Install the driver for your database in the build environment:
yarn add mysql2
# For PostgreSQL, use: yarn add pg

yarn sasat migration:build --standalone
# Optional output path (must end in .cjs):
yarn sasat migration:build --standalone --out build/migration.cjs
```

The default output is `migration.cjs` in the current directory. The command emits one file and does not create adjacent `.mjs` files. Without `--standalone`, `migration:build` keeps its existing per-file compilation behavior; ordinary `migrate` and generation commands are unchanged.

The standalone build reads `migration.dir`, validates `migration.target` if specified, and selects `migration.db.dialect` or `db.dialect` (default: MySQL). It does not need connection credentials or a live database. Explicit environment references for the directory, target, or dialect must be available when building; unused connection and generator settings are not resolved.

The executable includes:

- All migration `.ts` files from the configured directory, in filename order, and their statically imported JavaScript dependencies.
- `initialSchema.yml`, if present, as the starting schema description. It does not create the database tables described by that file; they must already exist.
- Sasat's migration runner and the selected JavaScript database driver.

Building does not execute migration imports, constructors, definitions, or hooks. Sasat does not embed `sasat.yml` or resolve its connection secrets into the artifact. Values hard-coded in migration source or its dependencies remain part of the bundle.

All definitions are included even when the build configuration specifies a target. The deployment configuration or `--target` determines the actual target at execution time. A build failure leaves an existing output file intact.

## Deploy and run

Copy `migration.cjs` and a deployment configuration to the destination:

```text
release/
  migration.cjs
  sasat.yml
```

For example, a MySQL deployment configuration:

```yaml
db:
  dialect: mysql
  host: $DB_HOST
  port: $DB_PORT
  user: $DB_USER
  password: $DB_PASSWORD
  database: $DB_NAME
migration:
  table: __migrate__
```

For PostgreSQL, build with `dialect: postgres`, install `pg` in the build environment, and use PostgreSQL connection settings at deployment. The runner rejects a dialect different from the one built into the executable. Rebuild to change database engines. The optional `migration.db` override works as it does with `sasat migrate`.

```sh
cd release
node migration.cjs --list
node migration.cjs --dry
node migration.cjs

# Explicit config path and target:
node migration.cjs --config /etc/my-app/sasat.yml --target 002_addStatus.ts
```

Provide the referenced environment variables when running the executable. Sasat does not load `.env` automatically. The default config is `sasat.yml` in the process working directory; `--config` selects another file without changing the working directory. A missing configuration file is an error. Runtime configuration uses the same full validation as `sasat migrate`, including any environment references in additional settings you choose to include. `migration.dir` is not read as a source directory by the runner.

| Option | Behavior |
| --- | --- |
| `--help`, `-h` | Show usage and the bundled dialect; no config, connection, or definition execution |
| `--list` | List embedded migration filenames; no config, connection, or definition execution |
| `--config <file>`, `-c` | Read the specified configuration file |
| `--target <name>`, `-t` | Override `migration.target`; use an exact embedded filename including `.ts` |
| `--dry`, `-d` | Read DB history and preview SQL without managed database writes or apply hooks |
| `--silent`, `-s` | Suppress normal progress and SQL output |

The default operation applies migrations. Omitting the target selects the last embedded migration. Selecting an earlier target runs the necessary `down` definitions. The runner uses the existing history checks, database-scoped lock, transaction handling, and before/after/after-commit hooks. Retries retain the existing [migration lifecycle and recovery rules](migration-lifecycle.md). Always keep already applied definitions unchanged when building a new release.

The standalone executable applies migrations only. It does not support application code generation (`-g`), migration compilation, or `dump-db`. Generate application code during your build instead.

## Boundaries

The artifact targets Node.js and the selected JavaScript driver. PostgreSQL native addons (`pg-native` / `NODE_PG_FORCE_NATIVE`) are unsupported. Building rejects unresolved static package imports or additional output files.

Files read at runtime, native addons, and nonliteral dynamic imports or computed `require` calls in your migration dependencies cannot be made self-contained automatically. Use statically imported JavaScript and embedded data for a two-file deployment. If a migration deliberately reads an external asset, that asset must also be deployed. Code using `import.meta.url` refers to the final executable after bundling, so module-relative filesystem paths may need adjustment.

Migration definitions still run during replay and dry runs. Keep them replayable and put application-time work in hooks. Direct I/O in imports, constructors, or definitions is not suppressed; this is the same contract as the regular CLI.
