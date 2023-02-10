# Sasat
rdb migration based graphql source code generator.
resolve relations without N + 1.

## getting stared
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
