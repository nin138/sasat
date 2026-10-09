# Database drivers and application bundles

Install the driver your application uses: `yarn add mysql2` or `yarn add pg`. Generation selects one static driver import, so the unused driver need not be installed or bundled.

## Use the generated database client

Generation creates two files:

- `out/__generated__/dbClient.ts`: recreated on generation; imports `createMysqlPoolClient` from `sasat/mysql`, or `createPostgresClient` from `sasat/postgres`, and holds a client for this output module.
- `out/dbClient.ts`: created once and preserved afterward; exposes `getDbClient` and `releaseDbClient` as an application customization point.

Generated data sources receive `getDbClient` as a function and call it on first use. A static schema import needs no explicit database initialization:

```ts
import { schema } from './out/schema.js';
// Start your GraphQL server with schema.
```

Database connection settings are read at runtime from `sasat.yml` or `setConfig`; credentials are never embedded by generation. Finish configuration before the first database operation. The generated driver must agree with `db.dialect`; changing database engines requires regeneration.

For direct SQL, transactions, optional pool tuning, or shutdown, import the generated module:

```ts
import { getDbClient, releaseDbClient } from './out/dbClient.js';

// Optional tuning must precede the first data-source operation.
const db = getDbClient({ connectionLimit: 10 }); // PostgreSQL: { max: 10 }
const rows = await db.executeQuery({ text: 'SELECT ? AS value', values: [42] });
// PostgreSQL SQL: SELECT $1::int AS value
await releaseDbClient();
```

Repeated calls reuse the client. Conflicting connection settings, explicit options, or loggers are rejected while it is active. An omitted options/logger argument reuses the initial choice. `releaseDbClient()` does not create an unused client; finish outstanding work before releasing. A subsequent call creates a new client using runtime settings and the options supplied to that call. Existing data sources retain their resolved executor, so create new data sources after replacing a client.

To apply tuning automatically, edit the preserved `out/dbClient.ts`:

```ts
import { getDbClient as getGeneratedDbClient } from './__generated__/dbClient.js';
export { releaseDbClient } from './__generated__/dbClient.js';

export const getDbClient = () => getGeneratedDbClient({ connectionLimit: 10 });
```

Different generated output modules hold separate clients. They still read the same Sasat configuration; inject independent clients with explicit settings for concurrent access to different databases.

## Independent clients and explicit driver injection

`createMysqlPoolClient(options, logger?)` from `sasat/mysql` and `createPostgresClient(options, logger?)` from `sasat/postgres` create independent clients. Each call returns a new client; it does not register a global driver or reuse a global pool. The driver is fixed by the entry point and the options are explicit. Release each client yourself. The existing `MysqlPoolClient`, non-pooled `MysqlClient`, and `PostgresClient` constructors remain available.

## Inject a driver explicitly

Common-entry constructors still accept an explicit driver as their third argument:

```ts
import mysql from 'mysql2/promise';
import { MysqlPoolClient } from 'sasat';

const db = new MysqlPoolClient(
  { host: 'localhost', database: 'example', user: 'app' },
  undefined, // optional SQL logger
  mysql,
);
// Pass db to your data sources and release it when finished.
```

For PostgreSQL, use `new PostgresClient(options, logger, pg)`. Applications importing `pg` directly in TypeScript should install `@types/pg`; the dedicated Sasat entry point includes its option types. `MysqlDriver`, `PostgresDriver`, and `DatabaseDriver` remain exported types.

## Upgrade existing generated code

Run `yarn sasat generate` to create the database modules. Existing `baseDBDataSource.ts` is application-owned and is not overwritten. Preserve its customizations and add these imports and this constructor to its existing class:

```ts
import type { SQLExecutor, SQLExecutorProvider } from 'sasat';
import { getDbClient } from './dbClient.js';

// Inside BaseDBDataSource:
constructor(client: SQLExecutor | SQLExecutorProvider = getDbClient) {
  super(client);
}
```

If it already has a constructor, adapt its call to `super` while keeping its custom logic. Pass the function `getDbClient`, not the eagerly evaluated `getDbClient()`. Direct subclasses of `SasatDBDatasource` must now supply an executor or a synchronous provider. This constructor change requires migration even though the legacy getter is retained.

Replace application imports of `getDbClient` from `sasat`, `sasat/mysql`, or `sasat/postgres` with the generated module. Those legacy getters are deprecated and retain a separate global pool for compatibility; they do not configure the generated client's pool. Explicit transaction injection still takes precedence over the generated provider.

## Build an ESM Node.js bundle with esbuild

Given an application entry point such as `server.ts`, this recipe embeds Sasat, the selected driver, and their JavaScript dependencies:

```js
// build.mjs
import { build } from 'esbuild';

await build({
  entryPoints: ['server.ts'],
  outfile: 'build/server.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  banner: {
    js: "import { createRequire as bundleCreateRequire } from 'node:module'; const require = bundleCreateRequire(import.meta.url);",
  },
});
```

The banner lets bundled CommonJS driver dependencies load Node built-ins. Do not mark the selected driver external, and do not use `packages: 'external'`, if it should be embedded. Your deployment still needs application configuration and any other files your own code reads. Standard JavaScript `pg` is covered; native addons such as `pg-native` require their own deployment handling.

For CommonJS, use `require('sasat/mysql')` or `require('sasat/postgres')` so the bundler selects the CommonJS export, then emit `format: 'cjs'` to a `.cjs` file. The ESM banner is not needed. Converting Sasat's ESM export to CommonJS also requires handling `import.meta.url` in its Node compatibility code.

Package regression tests generate real schemas for both databases, check the generated TypeScript, and run ESM/CommonJS bundles from a directory without `node_modules`. They verify that only the selected driver is embedded. Live checks run bound SQL and transaction-scoped generated data sources. For generated CommonJS applications, compile application/generated TypeScript to CommonJS first so its imports select Sasat's CommonJS export.

## Keep the existing runtime-loading behavior

Existing calls to `getDbClient()` or client constructors from `sasat` without injection continue to resolve the selected driver at runtime. That path does not automatically embed a driver in a bundle; deploy the driver in `node_modules`, or switch to one of the explicit APIs above. The CLI retains runtime loading. Importing the common entry point and using offline SQL generation still requires neither driver.
