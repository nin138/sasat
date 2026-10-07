# Runtime APIs and customization

[README](../README.md) · [Configuration](configuration.md) · [Application workflow](application-workflow.md)

These examples extend the README application, using `out/` for generated files and `server.ts` for the server.

## Using Apollo Server

Install `yarn add @apollo/server@^5`, then replace the README's server.ts with:

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { schema } from './out/schema.js';

const server = new ApolloServer(schema);
const { url } = await startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT ?? 4000) },
});
console.log(`GraphQL ready at ${url}`);
```

Run `yarn tsx server.ts`. This Apollo standalone example does not add a subscription transport. The Yoga example supports SSE subscriptions at the same `/graphql` endpoint.

## Context and middleware

Edit the application-owned `out/context.ts` to describe request-specific values:

```typescript
import type { BaseGQLContext } from './__generated__/context.js';

export type GQLContext = BaseGQLContext & { requestId: string };
```

For Yoga, create those values in server.ts:

```typescript
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import type { GQLContext } from './out/context.js';
import { schema } from './out/schema.js';

const yoga = createYoga({
  schema: createSchema(schema),
  context: ({ request }): GQLContext => ({
    requestId: request.headers.get('x-request-id') ?? randomUUID(),
  }),
});
createServer(yoga).listen(Number(process.env.PORT ?? 4000));
```

Add this export to `out/middlewares.ts`. The request ID demonstrates context propagation; it does not authenticate a request.

```typescript
import type { ResolverMiddleware } from 'sasat';
import type { GQLContext } from './context.js';

export const logRequest: ResolverMiddleware<GQLContext> = args => {
  console.log(args[2].requestId);
  return args;
};
```

Register the name in a migration, for example with `Queries.primary(['logRequest'])`, then regenerate. If a primary query already exists, replace its configuration rather than registering a duplicate. Use a new migration to change an already applied configuration.

Middleware synchronously transforms the resolver argument tuple. Complete asynchronous authentication in the server's context factory or another suitable layer, then check the result in middleware. Authorization to access a particular row still needs an application-level check.

For create/update mutations, `contextFields: [{ column: 'tenant_id', contextName: 'tenantId' }]` supplies a context value that takes precedence over client input. Use database column names; generated resolvers map them to public field names. Context values use database types, such as numeric foreign keys rather than encoded Hash IDs. This option does not automatically add tenant conditions to update/delete WHERE clauses.

## Data sources, connections, and paging

Add custom methods to the subclasses in `out/dataSources/db/*.ts`. The basic APIs are create/createBulk/upsert/update/delete/find/first/findPageable. You can also use them without GraphQL. Inspect generated base classes and SasatDBDatasource's TypeScript declarations for argument types and field mappings.

`getDbClient()` returns a shared pool. Changing database settings, explicit options, or the logger while that pool is active throws an error. Finish pending work and release the client before switching settings. For simultaneous access to separate databases, inject independent MysqlClient instances into your data sources.

Data-source constructors accept an SQLExecutor, so multiple operations can share the same transaction. The current pool client's transaction method opens a separate connection; the pool's connection limit does not govern those transaction connections. Generated mutations are not automatically wrapped in a transaction as a whole.

findPageable combines paging.where and options.where with AND before limiting the parent rows. paging.sort takes precedence, and related rows are fetched after selecting the parent page. A page size of zero returns no rows. Invalid limits and offsets, including negative, fractional, or non-finite values, are rejected. Set any business-level maximum page size in your application.

GraphQL selection handling supports named/inline fragments, multiple fieldNodes, skip/include directives, and type conditions. Additional relationship resolution and mutation refetches can issue more queries; inspect query counts for your application's requests.

## Receiving subscriptions

The README migration enables `Mutations.create({ subscription: true })`. With the Yoga server running, subscribe from one terminal:

```sh
curl -N http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  --data '{"query":"subscription { UserCreated { userId name } }"}'
```

Run the README's createUser mutation in another terminal to receive an event. Press Ctrl+C to disconnect. Local delivery is the default, so publishing and subscribing must use the same PubSub instance in the same process.

Configure filters with database column names, for example `subscription: { enabled: true, subscriptionFilter: ['userId'] }`. The corresponding selection is `UserCreated(userId: $id)` with an `ID!` variable. Hash ID reference columns are decoded with their referenced encoder before comparison. Renaming a public field does not rename the configured subscription argument.

## Redis delivery across processes

Newly generated `out/pubsub.ts` contains:

```typescript
import { createPubSub } from 'sasat';

export const pubsub = createPubSub();
```

If an older application uses new PubSub, update that file while preserving any custom behavior. Regeneration does not overwrite an existing pubsub.ts.

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `PUBSUB_BACKEND` | `local` | `local` or `redis` |
| `REDIS_URL` | None | Required for Redis; accepts redis:// and rediss:// |
| `PUBSUB_PREFIX` | `sasat:` | Match across communicating servers; separate applications and environments |

Start Redis separately, then run two servers with the same application code and database settings:

```sh
# Terminal 1
PORT=4000 PUBSUB_BACKEND=redis REDIS_URL=redis://127.0.0.1:6379 yarn tsx server.ts

# Terminal 2
PORT=4001 PUBSUB_BACKEND=redis REDIS_URL=redis://127.0.0.1:6379 yarn tsx server.ts
```

Subscribe on port 4000 and send a mutation to port 4001. Replace the Redis address with one reachable from your application. Explicit `createPubSub({ backend, redisUrl, channelPrefix })` arguments take precedence over environment variables.

Connections open on first publish/subscribe. Failures reject the operation without falling back to local delivery. A database write may have completed before publishing fails; define retry and duplicate-handling behavior accordingly. There is no replay of missed events after a disconnect. Query current state on reconnect when your application needs to recover missed changes.

During shutdown, finish pending publishes and stop subscriptions before calling `await pubsub.close()`. You can also provide a custom PubSubEngine in pubsub.ts.

<a id="limitations"></a>

## Current usage considerations

Check the following cases against the types and inputs your application uses.

| Area | Current behavior |
| --- | --- |
| createBulk | Uses the first row's field set, so fields present only in later rows are omitted. Use matching field sets or consider individual inserts |
| Hash IDs | Zero is not encoded on one output path, and nullable reference input can turn null into undefined. Verify reference clearing and boundary values |
| decimal / ordinary bigint | Maps to GraphQL Int, which cannot return fractions or values outside its 32-bit range. Plan a representation that preserves the precision you need |
| first | Does not automatically add LIMIT 1. Inspect returned row counts for large datasets |
| update with noRefetch | Returns true only when changedRows is 1. An unchanged value and a missing row can both return false |
| Delete events | The payload contains identifying input, not the complete deleted row. Check requested fields and filters |
| generator.gql.subscription | Setting this global option to false does not currently disable generation. Check table and mutation settings as well |

Include relevant cases in your application tests when upgrading Sasat. See [application workflow](application-workflow.md).
