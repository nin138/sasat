# Sasat

**Generate TypeScript data sources and a GraphQL API from MySQL or PostgreSQL migration definitions.**

Define tables, relationships, queries, and mutations in TypeScript. Use those definitions to apply database changes and generate application code, then extend the generated data sources and schema with your own logic.

Sasat works with GraphQL Yoga and Apollo Server. Your application configures the HTTP server, authentication, authorization, and request context. Redis is optional and enables subscription events across processes.

## Start here

| Goal | Guide |
| --- | --- |
| Add Sasat to an application | Quick start below |
| Generate SQL or use multiple database engines | [SQL generation and connections](docs/sql-generation.md) |
| Execute SQL with bind values | [Parameterized SQL and prepared statements](docs/prepared-statements.md) |
| Run several operations in one transaction | [Managed transactions and session cleanup](docs/transactions.md) |
| Use PostgreSQL | [PostgreSQL setup and compatibility](docs/postgresql.md) |
| Understand the application structure | [Application structure and generated files](docs/architecture.md) |
| Configure the CLI and code generation | [Configuration and migrations](docs/configuration.md) |
| Use migration hooks and recover failures | [Migration lifecycle](docs/migration-lifecycle.md) |
| Add context, custom logic, or subscriptions | [Runtime APIs and customization](docs/runtime.md) |
| Change your schema or update Sasat | [Application workflow](docs/application-workflow.md) |
| Work on Sasat itself | [Contributor guide](docs/development.md) |

## Quick start

You need Node.js 22 or later, Yarn, and a running MySQL 8 instance. This example creates an application with a user registration and query API. Redis is not required. For PostgreSQL, use the [PostgreSQL connection settings and database-creation statement](docs/postgresql.md#configure-an-application), then follow the same migration and server steps.

### 1. Install the packages

```sh
mkdir sasat-example
cd sasat-example
yarn init
yarn add sasat mysql2 graphql@^16 graphql-yoga@^5
yarn add --dev typescript tsx @types/node
yarn sasat init
```

Install only the database driver you use: `mysql2` for MySQL or `pg` for PostgreSQL. Both are optional peer dependencies. PostgreSQL users should replace `mysql2` with `pg` in the command above.

Use `getDbClient` from `sasat/mysql` or `sasat/postgres` to make the selected driver available to your bundler. You can also [inject a driver explicitly](docs/bundling.md#inject-a-driver-explicitly). The unused driver need not be installed. See [bundling and deployment](docs/bundling.md) for a complete build example.

Add `"type": "module"` to your `package.json`. Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["server.ts", "migrations/**/*.ts", "out/**/*.ts"]
}
```

### 2. Configure the database

Create an empty database for this example. The normal `migrate` command does not create the database itself.

```sql
CREATE DATABASE sasat_example CHARACTER SET utf8mb4;
```

Set `DB_USER` and `DB_PASSWORD` in your shell environment to the credentials of your MySQL account. Replace the generated `sasat.yml` with:

```yaml
db:
  host: 127.0.0.1
  port: 3306
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

`$NAME` reads a process environment variable. Sasat does not load `.env` automatically. Run commands from the application directory containing `sasat.yml`, and adjust the host and port for your database. The CLI and application server both need the connection environment variables.

### 3. Define a migration

```sh
yarn sasat migration:create createUser
```

Replace the contents of the new `migrations/<timestamp>createUser.ts` file with:

```typescript
import { Mutations, Queries } from 'sasat/migration';
import type { MigrationStore, SasatMigration } from 'sasat/migration';

export default class CreateUser implements SasatMigration {
  up(store: MigrationStore): void {
    store.createTable('user', table => {
      table.autoIncrementHashId('userId');
      table.column('name').varchar(100);
      table.enableGQL();
      table.addGQLQuery(Queries.primary(), Queries.paging('users'));
      table.addGQLMutation(
        Mutations.create({ subscription: true }),
        Mutations.update({ noRefetch: true }),
        Mutations.delete(),
      );
    });
  }

  down(store: MigrationStore): void {
    store.dropTable('user');
  }
}
```

The database stores a numeric primary key; GraphQL exposes it as an encoded Hash ID. See [Hash IDs](docs/hash-ids.md) for nullable references, validation, and TypeScript types. `enableGQL()` enables the table for GraphQL, and the query/mutation declarations select the operations to expose.

### 4. Apply the migration and generate code

```sh
yarn sasat migrate --dry
yarn sasat migrate --generateFiles
yarn tsc --noEmit
```

The `out/` directory now contains types, data sources, and a GraphQL schema and resolvers. `--dry` skips Sasat's SQL application and apply hooks, but still replays migration definitions. See [dry-run behavior](docs/configuration.md#dry-run).

### 5. Start a GraphQL server

Create `server.ts` in your application root:

```typescript
import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import { getDbClient } from 'sasat/mysql'; // PostgreSQL: sasat/postgres

getDbClient();
const { schema } = await import('./out/schema.js');

const yoga = createYoga({ schema: createSchema(schema) });
const port = Number(process.env.PORT ?? 4000);

createServer(yoga).listen(port, () => {
  console.log(`GraphQL ready at http://localhost:${port}/graphql`);
});
```

```sh
yarn tsx server.ts
```

Open `http://localhost:4000/graphql` in your browser, or create and query a user from another terminal:

```sh
curl http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"mutation { createUser(user: { name: \"Alice\" }) { userId name } }"}'

curl http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ users(option: { numberOfItem: 10, offset: 0 }) { userId name } }"}'
```

The mutation returns an encoded `userId` and `name: "Alice"`. The list query includes the new user. The exact ID depends on the generated database ID and encoder configuration.

Use the returned ID with `user(userId: "...")` to fetch one user. See [runtime customization](docs/runtime.md) for Apollo Server, context, and subscription examples.

## Where to add your code

| Location | Purpose and regeneration behavior |
| --- | --- |
| `migrations/*.ts` | Source definitions for the database schema and exposed API |
| `out/__generated__/` | Recreated on every generation; do not edit directly |
| `out/dataSources/db/*.ts` | Application data-source subclasses; existing files are preserved |
| `out/schema.ts`, `context.ts`, `pubsub.ts`, `baseDBDataSource.ts` | Created once, then maintained by your application |
| `out/conditions.ts`, `idEncoder.ts`, `middlewares.ts` | Existing content is read and missing declarations are added |

Add database changes in new migrations rather than rewriting applied definitions. Use `yarn sasat generate` to regenerate code from existing definitions. Files created only once are not automatically updated when Sasat changes; review and apply any required updates yourself.

## Current limitations

- MySQL and PostgreSQL are supported. Database-specific SQL and native PostgreSQL types have [compatibility limits](docs/postgresql.md#schema-imports-and-boundaries).
- `contextFields` supplies server-side input values. It does not automatically enforce tenant authorization for every operation.
- Generation restores previous output on ordinary publication errors. Process termination and concurrent writers are outside that guarantee; see [generation recovery](docs/migration-lifecycle.md#generation-failure-and-recovery).
- Decimal uses GraphQL `Decimal` / TypeScript `string`; bigint uses GraphQL `BigInt` / TypeScript `bigint`. Both use strings in GraphQL JSON. See [numeric types and upgrading](docs/numeric-types.md).
- Check [usage considerations](docs/runtime.md#limitations) for Hash IDs, bulk inserts, and other runtime behavior.
- A failed Redis publish does not undo an already completed database write.

The package exports `sasat` for runtime APIs, `sasat/mysql` and `sasat/postgres` for explicit driver entry points, `sasat/migration` for migration definitions, and `sasat/testing` for test-database helpers. ESM, CommonJS, and TypeScript declarations are provided.

## Contributing

To build or change Sasat itself, see the [contributor guide](docs/development.md) for setup, tests, sample servers, and a source-code map. Read [AGENTS.md](AGENTS.md) before making changes; it provides repository instructions for human and AI contributors.

License: MIT, as declared in [package.json](package.json).
