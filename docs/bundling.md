# Database drivers and application bundles

Install the driver you use in your application: `yarn add mysql2` or `yarn add pg`. Sasat provides explicit database entry points so your bundler can include that driver without resolving the other one.

## Use a database entry point

For MySQL, with MySQL settings in `sasat.yml`:

```ts
import { getDbClient } from 'sasat/mysql';

const db = getDbClient({ connectionLimit: 10 });
const rows = await db.executeQuery({ text: 'SELECT ? AS value', values: [42] });
await db.release();
```

For PostgreSQL, with `db.dialect: postgres` and PostgreSQL connection settings:

```ts
import { getDbClient } from 'sasat/postgres';

const db = getDbClient({ max: 10 });
const rows = await db.executeQuery({ text: 'SELECT $1::int AS value', values: [42] });
await db.release();
```

These entry points statically import `mysql2/promise` and `pg`, respectively. Importing an entry point requires its driver to be installed at build time. Pool creation remains lazy. They do not change configuration; using an entry point that disagrees with `db.dialect` throws an error.

The shared client is the same one returned by `getDbClient()` from `sasat`. Initialize it through the selected entry point **before constructing data sources**. If generated resolvers instantiate data sources during module evaluation, load the schema after initialization:

```ts
import { getDbClient } from 'sasat/mysql'; // use sasat/postgres for PostgreSQL

const db = getDbClient();
const { schema } = await import('./out/schema.js');
// Start your GraphQL server with schema. On shutdown, await db.release().
```

A static schema import executes before the initialization statement, even when written below it. Importing the database entry point alone does not register a global driver or initialize the shared client.

For independent clients, use `MysqlPoolClient` or the non-pooled `MysqlClient` from `sasat/mysql`, or `PostgresClient` from `sasat/postgres`. These constructors accept connection options and an optional logger. Pass the resulting client to a data-source constructor instead of using its default shared client. Release independent pools yourself.

## Inject a driver explicitly

The common entry point accepts a driver as the third argument. This makes your application's static driver import visible to its bundler:

```ts
import mysql from 'mysql2/promise';
import { getDbClient, MysqlPoolClient } from 'sasat';

const db = getDbClient({ connectionLimit: 10 }, undefined, {
  dialect: 'mysql',
  driver: mysql,
});

const independent = new MysqlPoolClient(
  { host: 'localhost', database: 'example', user: 'app' },
  undefined, // optional SQL logger
  mysql,
);
```

For PostgreSQL, import `pg` and pass `{ dialect: 'postgres', driver: pg }`; an independent `PostgresClient(options, logger, pg)` also accepts injection. Applications that import `pg` directly in TypeScript should install `@types/pg` as a development dependency. Using `sasat/postgres` does not require it.

`MysqlDriver`, `PostgresDriver`, and the discriminated `DatabaseDriver` type are exported from `sasat`. Injection is per client and takes precedence over runtime module loading. An active shared client rejects a different driver object, settings, or logger. Finish outstanding work and release it before replacing it. Repeated calls without a driver reuse the initialized client; after release, initialize through the database entry point or supply the driver again.

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

Package regression tests embed each driver through both APIs, check that the other driver's modules are absent, and run ESM/CommonJS bundles from a directory with no `node_modules`. Live checks also run bound queries and managed transactions from those isolated bundles against MySQL and PostgreSQL.

## Keep the existing runtime-loading behavior

Existing calls to `getDbClient()` or client constructors from `sasat` without injection continue to resolve the selected driver at runtime. That path does not automatically embed a driver in a bundle; deploy the driver in `node_modules`, or switch to one of the explicit APIs above. The CLI retains runtime loading. Importing the common entry point and using offline SQL generation still requires neither driver.
