# Sasat
rdb migration based graphql source code generator.
resolve relations without N + 1.

## getting stared
Requires Node.js 22 or later.

```sh
$ npm i sasat
$ npm run sasat init
```

## commands
```sh
# make migration file
$ npm sasat migration:create ${migration name}

# generate file
$ npm sasat generate

# migrate
$ npm sasat migrate
```

`sasat migrate --dry` previews pending SQL without creating the migration
history table or applying migrations. With `--generateFiles`, dry runs also skip
application code, `currentSchema.yml`, and `test.migration.json` generation.
Migration sources are still compiled to `.mjs` to calculate the preview; use
`--skipBuild` when those compiled files are already up to date.

## config file
`projectroot/sasat.yml`
```yml
migration:
  dir:   # migration file dir
  table: # migration table name
  out:   # generate file output dir
generator:
  addJsExtToImportStatement: # add `.js` ext to import statement when this value is true
db:
  host: # if value starts with `$` read from environment variable. (e.g. $DB_HOST => process.env.DB_HOST)
  port:
  user:
  password:
  database:
```

## migration
- 1_ create migration file `$npm sasat migration:create ${migration name}
- 2_ edit migration file

```typescript
// sample migraiton
import {
  Queries,
  SasatMigration,
  MigrationStore,
  Conditions,
  Mutations,
} from '../../src/index.js';

export default class CreateUser implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return store.createTable('user' /* tableName */, table => {
      table.autoIncrementHashId('userId'); // create userId column primary key
      table
        .column('name')
        .varchar(20)
        .default('no name')
        .notNull();
      table
        .column('nickName')
        .varchar(20)
        .nullable()
        .unique();
      table.createdAt().updatedAt();
      table.enableGQL(); // enable Graphql
      table.addGQLQuery(
        Queries.primary(), // add query
      );
      table.addGQLMutation(
        Mutations.create(), // add create mutation
      );
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('user');
  };
}
```
- 3_ run `$ npm run sasat migrate -g`
- 4_ add server file
```typescript
import { ApolloServer } from '@apollo/server';
import { resolvers } from './out/__generated__/resolver.js';
import { inputs, typeDefs } from './out/__generated__/typeDefs.js';
import { createTypeDef } from 'sasat';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer<Context>({
  typeDefs: createTypeDef(typeDefs, inputs),
  resolvers,
});

const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });
console.log(`🚀 Server ready at ${url}`);
```
- 5_ run server!

## Using GraphQL Yoga

Install Yoga in your application and use the generated schema and resolvers:

```sh
yarn add sasat graphql@^16 graphql-yoga@^5
yarn add --dev tsx typescript
```

The following example assumes `migration.out: ./out` and generated files with
`.js` import extensions. Add application context fields to the user-editable
`out/context.ts`:

```typescript
import type { BaseGQLContext } from './__generated__/context.js';

export type GQLContext = BaseGQLContext & { requestId: string };
```

Create `server.ts` in the application root:

```typescript
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import { createTypeDef } from 'sasat';
import type { GQLContext } from './out/context.js';
import { resolvers } from './out/__generated__/resolver.js';
import { inputs, typeDefs } from './out/__generated__/typeDefs.js';

const yoga = createYoga({
  schema: createSchema({
    typeDefs: createTypeDef(typeDefs, inputs),
    resolvers,
  }),
  context: ({ request }): GQLContext => ({
    requestId: request.headers.get('x-request-id') ?? randomUUID(),
  }),
});

const port = Number(process.env.PORT ?? 4000);
createServer(yoga).listen(port, () => {
  console.log(`Yoga ready at http://localhost:${port}/graphql`);
});
```

Run `yarn tsx server.ts` after configuring the generated database connection and
applying your migrations. Yoga creates context for each request; Sasat resolvers
and resolver middleware receive it as their third argument. If your migrations
define required context fields, also supply those fields in the factory above.
See the [Yoga context documentation](https://the-guild.dev/graphql/yoga-server/docs/features/context).

For example, export this middleware from `out/middlewares.ts` and register its
name in a migration with
`Queries.primary(['logRequest'])`, then regenerate:

```typescript
import type { ResolverMiddleware } from 'sasat';
import type { GQLContext } from './context.js';

export const logRequest: ResolverMiddleware<GQLContext> = args => {
  console.log(args[2].requestId);
  return args;
};
```

Authentication is application-defined: verify credentials in your context
factory and use middleware to enforce access before running a resolver.
The request ID above only demonstrates context propagation. Continue overriding
generated DataSource methods in `out/dataSources/db/*.ts`; Yoga uses the same
user-editable subclasses as Apollo.

### Connecting to subscriptions

Enable subscriptions in the relevant migration, for example
`Mutations.create({ subscription: true })`, and regenerate. Yoga serves
subscriptions over SSE at the same `/graphql` endpoint. See the
[Yoga subscription documentation](https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions).

Subscription filters on Hash ID columns (including references) accept encoded
`ID!` arguments and decode them with the corresponding column encoder before
comparing event data. Other filter types are unchanged. Arguments retain the
configured database column names even when entity fields are renamed. Regenerate
existing code to apply this fix; clients using `Int!` variables for these filters
must switch to `ID!` and pass the encoded ID.

To try the repository's generated `UserCreated` subscription, start
`yarn server:yoga` with the migrated test database, then keep this request open:

```sh
curl -N http://localhost:4445/graphql \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  --data '{"query":"subscription { UserCreated { userId NNN } }"}'
```

In another terminal, send a mutation to the same Yoga process:

```sh
curl http://localhost:4445/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"mutation { createUser(user: { NNN: \"Yoga example\" }) { userId NNN } }"}'
```

The first terminal receives an `event: next` with the created user. Press Ctrl+C
to disconnect and release the subscription. Replace the URL and fields with
your application's generated schema when using the `server.ts` example above.
For a JavaScript client, run `yarn add graphql-sse` and use distinct connections mode:

```typescript
import { createClient } from 'graphql-sse';

const client = createClient({ url: 'http://localhost:4445/graphql' });
const unsubscribe = client.subscribe(
  { query: 'subscription { UserCreated { userId NNN } }' },
  {
    next: result => console.log(result),
    error: error => console.error(error),
    complete: () => console.log('Subscription complete'),
  },
);

// Call when the UI is unmounted or the subscription is no longer needed.
// unsubscribe();
// client.dispose(); // Dispose the client when all subscriptions are finished.
```

### Shared database client

`getDbClient()` reuses the active connection pool. Calls with the same explicit
connection options and logger also reuse it. While the pool is active, changing
explicit options, supplying a different logger, or changing `config().db` throws
an error instead of silently using the previous database. Stop pending work and
`await client.release()` before changing settings. For simultaneous connections
to different databases, construct separate `MysqlClient` instances and inject
them into your data sources.

`findPageable(paging, fields, options)` combines `paging.where` and
`options.where` with AND before applying the page's limit and offset. Explicit
joins from both options participate in that parent query. `paging.sort` takes
precedence over `options.sort`; `options.lock` applies to both the parent
subquery and the outer query. Related rows are loaded after the parent page
has been selected. A `limit` or `numberOfItem` of `0` returns no rows. Limits
and offsets must be non-negative safe integers; negative, fractional, and
non-finite values are rejected before SQL execution.

### Selecting local or Redis PubSub

Newly generated `out/pubsub.ts` uses Sasat's configurable PubSub factory:

```typescript
import { createPubSub } from 'sasat';

export const pubsub = createPubSub();
```

Existing `pubsub.ts` files are user-owned and preserved during regeneration.
To opt in, replace the original `new PubSub()` setup with the code above; keep
any application-specific customization you need.

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `PUBSUB_BACKEND` | `local` | `local` for in-process events, `redis` for shared events |
| `REDIS_URL` | none | Required for Redis; accepts `redis://` or TLS `rediss://` URLs |
| `PUBSUB_PREFIX` | `sasat:` | Redis channel prefix; use the same value on communicating servers and different values for separate applications/environments |

Local mode works without Redis. To use Redis from the host, start the Compose
service and run the application servers in separate terminals:

```sh
docker compose up -d redis

# Terminal 1
PUBSUB_BACKEND=redis REDIS_URL=redis://127.0.0.1:6379 yarn server:apollo

# Terminal 2
PUBSUB_BACKEND=redis REDIS_URL=redis://127.0.0.1:6379 yarn server:yoga
```

The Compose `dev` service sets `REDIS_URL=redis://redis:6379`; recreate an existing
`dev` container to pick up that setting, or pass the URL explicitly. Inside it,
run `PUBSUB_BACKEND=redis yarn server:apollo` and
`PUBSUB_BACKEND=redis yarn server:yoga`. The Redis host port is loopback-only and
can be changed with `REDIS_PORT`. This development Redis has persistence disabled.

An Apollo mutation can now publish to a Yoga SSE subscriber in another process.
To return to local delivery, restart each application with `PUBSUB_BACKEND=local`.
Redis connections open on first publish/subscribe; connection failures reject
operations and do not fall back to local mode. A mutation's database write may
already have completed when publishing fails. Redis Pub/Sub does not replay
missed events after a disconnect; clients should query current state on reconnect.

You can also pass explicit `backend`, `redisUrl`, and `channelPrefix` options to
`createPubSub()`. Explicit options take precedence over environment variables.
Await pending publishes and stop subscriptions before calling
`await pubsub.close()` during application shutdown. Custom `PubSubEngine`
implementations remain supported in the user-editable `out/pubsub.ts`.

## Development servers

Both servers use GraphQL 16 and share the generated schema, resolvers, and
custom fields in `test/serverSchema.ts`.

Sasat does not require Apollo Server. Install the server you want to use in your
application; this repository keeps both Apollo Server and Yoga as development
dependencies for compatibility testing.

| Command | Server | Endpoint |
| --- | --- | --- |
| `yarn server` or `yarn server:apollo` | Apollo Server | `http://localhost:4444/` |
| `yarn server:yoga` | GraphQL Yoga | `http://localhost:4445/graphql` |

Run the commands in separate terminals to use both at the same time. Set `PORT`
to override the port. Both commands load `.env` when present; a missing `.env`
does not prevent startup. Queries and mutations that access data require the
configured MySQL database and migrations. Starting the servers does not reset
the database or run migrations.

## Testing

Install the locked dependencies with `yarn install --immutable`. Unit and HTTP smoke tests run without a MySQL server or a local `.env` file.

- `yarn test:unit`: run the unit and file-generation integration tests.
- `yarn test:coverage`: run the same suite and write coverage reports to `coverage/` (HTML: `coverage/lcov-report/index.html`).
- `yarn test:typecheck`: type-check the implementation, tests, and both development servers.
- `yarn test:unit src/runtime/date.test.ts`: run a specific test file.
- `yarn test:unit test/servers.test.ts`: start both servers on temporary ports and
  check their HTTP query/mutation handling, schema parity, and validation without
  database access.

Tests use temporary directories for filesystem operations, mock database connections, and run clock-dependent cases in UTC. They cover SQL generation, migration execution and rollback, configuration, GraphQL resolvers, generated TypeScript and GraphQL schemas, and preservation of user edits during regeneration. Type-only declarations are checked by TypeScript; generated output is verified through the generator tests.

The existing `yarn test` command still runs its database reset and migration pretest step; use it only with a disposable test database. Live MySQL compatibility is not covered by the mocked connector tests.

### MySQL integration tests

Start the development MySQL instance with `docker compose up -d db`, then run:

```sh
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3308 yarn test:integration
```

From the existing `dev` container, use `TEST_DB_HOST=db TEST_DB_PORT=3306`.
Optional `TEST_DB_USER` and `TEST_DB_PASSWORD` configure the test connection
(defaults: `root` and an empty password). The account must be allowed to create
and drop databases. This command uses only these explicit test settings; it does
not load `.env` or use the application's `DATABASE` setting.

The server tests create two uniquely named `sasat_it_*` databases, apply the test
migrations and seed data, and start Apollo and Yoga on temporary ports. They
compare queries, pagination, nested relations, creates and updates against real
MySQL. They also check nonexistent IDs, duplicate-key errors, and application-defined
authentication around a generated mutation (missing/invalid credentials reject
writes; valid credentials allow them). Authentication fixtures use temporary,
random test tokens and do not change the development servers' authentication.
Yoga tests also cover mutation-triggered SSE events, renamed-field
filters, and server-side subscription cleanup after disconnects. The servers
stop and their databases are dropped on completion, including test failures.
Additional tests use their own disposable databases to check query conditions,
zero-sized pages, and migration CLI dry runs with both missing and existing
history tables. Temporary CLI files are removed afterward. This suite is
separate from `test:unit` and never resets an existing database.

The default integration run uses local PubSub. To test Redis delivery across
processes, start both services and run:

```sh
docker compose up -d db redis
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3308 \
  TEST_REDIS_URL=redis://127.0.0.1:6379 yarn test:integration:redis
```

Inside `dev`, use `TEST_DB_HOST=db TEST_DB_PORT=3306` and
`TEST_REDIS_URL=redis://redis:6379`. Redis tests publish mutations through Apollo
and receive/filter events on Yoga, verify disconnect cleanup, and check channel
prefix isolation. Each run uses a unique prefix and never flushes Redis.

The error tests run in production mode and preserve each server's default error
handling. A missing row returns `user: null` and updating a missing row returns
`updateUser: false`. A middleware `GraphQLError` with code `UNAUTHENTICATED` is
exposed by both servers. For a database constraint error, Apollo returns the
database message while Yoga masks it as `Unexpected error.`; both use code
`INTERNAL_SERVER_ERROR`. These execution failures return HTTP 200 with `errors`
and `data: null` because the tested mutation field is non-null. This is an
intentional comparison of current defaults, not a shared error-format policy.
See [Yoga error masking](https://the-guild.dev/graphql/yoga-server/docs/features/error-masking)
when defining your application's public errors.

If generated code predates these fixes, regenerate it to update relation
resolvers and subscription filters. Paging now sorts against the root table
alias, and subscription arguments retain their existing names when a database
column has a different public field name.
