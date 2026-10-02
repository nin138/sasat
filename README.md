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

## Development servers

Both servers use GraphQL 16 and share the generated schema, resolvers, and
custom fields in `test/serverSchema.ts`.

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

Install the locked dependencies with `yarn install --immutable`. Tests run without a MySQL server or a local `.env` file.

- `yarn test:unit`: run the unit and file-generation integration tests.
- `yarn test:coverage`: run the same suite and write coverage reports to `coverage/` (HTML: `coverage/lcov-report/index.html`).
- `yarn test:typecheck`: type-check the implementation, tests, and both development servers.
- `yarn test:unit src/runtime/date.test.ts`: run a specific test file.
- `yarn test:unit test/servers.test.ts`: start both servers on temporary ports and
  check their HTTP query/mutation handling, schema parity, and validation without
  database access.

Tests use temporary directories for filesystem operations, mock database connections, and run clock-dependent cases in UTC. They cover SQL generation, migration execution and rollback, configuration, GraphQL resolvers, generated TypeScript and GraphQL schemas, and preservation of user edits during regeneration. Type-only declarations are checked by TypeScript; generated output is verified through the generator tests.

The existing `yarn test` command still runs its database reset and migration pretest step; use it only with a disposable test database. Live MySQL compatibility is not covered by the mocked connector tests.
