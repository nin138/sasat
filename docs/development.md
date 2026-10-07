# Contributing to Sasat

[README](../README.md) · [Application workflow](application-workflow.md)

This guide is for contributors changing the library itself. To use Sasat in your application, follow the README quick start.

## Repository setup

Read [AGENTS.md](../AGENTS.md), plus AGENTS.override.md if present locally. Check `git status` before editing and preserve unrelated changes.

Node.js 22 or later is required. The repository specifies Node 24.15.0 through Volta and Yarn 4.18.0 through packageManager. Use [package.json](../package.json) and [.yarnrc.yml](../.yarnrc.yml) as the source of truth.

```sh
git clone https://github.com/nin138/sasat.git
cd sasat
yarn --version
yarn install --immutable
yarn build
yarn test:typecheck
yarn test:unit
```

Make sure Yarn matches the configured version. If Corepack is already installed, `corepack enable` enables its package-manager shims. Manage dependencies with Yarn and keep yarn.lock consistent.

Build output in dist includes ESM, CommonJS, and type declarations. Both database drivers are devDependencies for repository testing and optional peers for applications. Their JavaScript remains external and loads on demand; their public option declarations are bundled with attribution in dist/licenses. The unit and HTTP smoke suites do not require a database or a local .env file.

## Validation commands

| Command | Purpose |
| --- | --- |
| `yarn build` | Build distribution files and declarations |
| `yarn test:typecheck` | Check implementation, tests, sample servers, and integration-test types |
| `yarn test:unit` | Run unit, generated-code, and database-free HTTP checks |
| `yarn test:unit src/runtime/date.test.ts` | Run one test file |
| `yarn test:unit test/servers.test.ts` | Start Apollo/Yoga and compare HTTP and schemas |
| `yarn test:coverage` | Write coverage reports under coverage |
| `yarn test:integration` | Run live MySQL integration tests |
| `yarn test:package` | Check built ESM/CJS entry points and strict consumer types with neither driver, MySQL only, or PostgreSQL only installed; run build first |
| `yarn test:integration:postgres` | Run live PostgreSQL integration tests |
| `yarn test:integration:redis` | Run MySQL and Redis integration tests |
| `yarn lint` | Run Biome lint |
| `yarn biome check <changed-files>` | Check selected code without rewriting it |

**`yarn test` resets the database and runs migrations in pretest.** Use it only after confirming that its connection targets a disposable database. Prefer test:unit for routine unit checks. `yarn check` and `yarn format` modify files; scope them and inspect the diff.

## Sample servers

Start the repository's MySQL service from the host:

```sh
docker compose up -d db
```

After MySQL is ready, create a local `.env` with the Compose development settings below. Do not commit credentials. Use different settings if you connect to another database.

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3308
DB_USER=root
DB_PASSWORD=
DATABASE=test
```

The repository's sasat.yml uses test/migrations and generates into test/out. Inspect existing changes before applying migrations and regenerating that output:

```sh
yarn sasat migrate --generateFiles
```

Here `yarn sasat` is a repository script using env-cmd. If you have already set shell variables and do not use .env, run `yarn tsx src/cli/index.ts <command>` instead.

| Command | Endpoint |
| --- | --- |
| `yarn server` / `yarn server:apollo` | `http://localhost:4444/` |
| `yarn server:yoga` | `http://localhost:4445/graphql` |

Run them in separate terminals; PORT overrides the port. Both scripts load .env when present, preserving existing environment variables. Starting a server does not migrate or reset the database.

The servers share [test/serverSchema.ts](../test/serverSchema.ts) and test/out. Unlike the README application, the sample User's name field is **NNN**:

```sh
curl http://localhost:4445/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"mutation { createUser(user: { NNN: \"Example\" }) { userId NNN } }"}'
```

For cross-process events, start `docker compose up -d redis` and run each server with `PUBSUB_BACKEND=redis REDIS_URL=redis://127.0.0.1:6379`. Subscribe through Yoga to `subscription { UserCreated { userId NNN } }` and publish through Apollo. See the [SSE request format](runtime.md), adjusting the port and fields.

The development Redis binds its host port to loopback and disables persistence. REDIS_PORT changes that host port. Inside the dev container, use DB_HOST=db, DB_PORT=3306, and REDIS_URL=redis://redis:6379. The dev service mounts `.env_dev` as `/app/.env`; prepare that local file before starting the container.

## Live integration tests

```sh
docker compose up -d db
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3308 yarn test:integration
```

TEST_DB_USER and TEST_DB_PASSWORD override the default root/empty-password connection. The account needs create/drop database permissions. This command does not load .env or use the application's DATABASE setting.

Fixtures create uniquely named databases and clean them up after use. They cover real CRUD, query conditions, paging, context propagation, authentication boundaries, constraints, and CLI dry runs. Migration lifecycle fixtures also check hook ordering, generation without hooks, concurrent CLI processes, DML/DDL failure recovery, and session-lock cleanup on both engines (including PostgreSQL pools with `max: 1`).

For PostgreSQL:

```sh
docker compose up -d postgres
yarn build
TEST_PG_HOST=127.0.0.1 TEST_PG_PORT=5433 yarn test:integration:postgres
```

The Compose PostgreSQL service is for local development, uses trust authentication, and binds its host port to loopback. POSTGRES_PORT changes that host port. Without Compose, TEST_PG_PORT defaults to 5432. TEST_PG_USER defaults to postgres and TEST_PG_PASSWORD to an empty string. The test account needs CREATE/DROP DATABASE permissions and access to the postgres maintenance database. Tests use randomly named databases and remove them afterward; they do not migrate the application database. Build first because CLI and generated-code checks exercise distribution files. Inside dev, use TEST_PG_HOST=postgres and TEST_PG_PORT=5432.

For Redis:

```sh
docker compose up -d db redis
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3308 \
  TEST_REDIS_URL=redis://127.0.0.1:6379 yarn test:integration:redis
```

Inside dev, use TEST_DB_HOST=db, TEST_DB_PORT=3306, and TEST_REDIS_URL=redis://redis:6379. Redis tests use unique channel prefixes and do not flush the server.

Apollo and Yoga retain their default error handling in comparison tests. For example, database errors may be exposed by Apollo and masked by Yoga; Sasat does not impose a shared public error policy.

## Source map

| Area | Start here |
| --- | --- |
| Public runtime API | [src/index.ts](../src/index.ts) |
| Migration and testing exports | [migration/index.ts](../src/migration/index.ts), [testing/index.ts](../src/testing/index.ts) |
| Configuration and CLI | [src/config](../src/config), [src/cli](../src/cli) |
| Schema definitions and migration execution | [src/migration](../src/migration) |
| Parsing and code generation | [src/generatorv2](../src/generatorv2) |
| Generated TypeScript construction | [src/tsg](../src/tsg) |
| CRUD and paging | [sasatDBDatasource.ts](../src/runtime/sasatDBDatasource.ts), [runQuery.ts](../src/runtime/sql/runQuery.ts) |
| SQL expressions and hydration | [runtime/dsl](../src/runtime/dsl) |
| GraphQL selections | [gqlResolveInfoToField.ts](../src/runtime/gqlResolveInfoToField.ts) |
| PubSub | [createPubSub.ts](../src/runtime/createPubSub.ts) |
| Active database connectors | [getDbClient.ts](../src/db/getDbClient.ts), [connectors/mysql](../src/db/connectors/mysql), [connectors/postgres](../src/db/connectors/postgres) |
| Generated examples and integration tests | [test/out](../test/out), [test/integration](../test/integration), [test/postgres](../test/postgres) |

The connectors_v2 directory also exists, but the current public connection path uses connectors. Trace the active call path before choosing an implementation to change.

## Making changes

Read the related source and tests before editing. For generated behavior, update the generator and regenerate as needed; editing only test/out/__generated__ is not a lasting fix. Verify that user-owned extension files remain preserved.

Check public API and generated-code compatibility, migration behavior, and failure handling. SQL changes should verify which rows are affected, including nested conditions, zero/null values, relationships, and authorization conditions. Performance changes should measure database row counts and query time separately from hydration.

Run checks appropriate to the change and report results and untested areas. Repository instructions apply to both human and AI contributors. Local logs or overrides may exist, but public setup should not depend on ignored `_docs` or `_logs` files.
