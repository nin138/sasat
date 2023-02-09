import {
  Queries,
  SasatMigration,
  MigrationStore,
  Conditions,
  Mutations,
} from '../../src/index.js';
import { SqlString } from 'sasat/runtime/sql/sqlString.js';

const a = 'a';

console.log(SqlString.escape(a));

export default class CreateUser implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return store.createTable('user', table => {
      // table
      //   .column('userId')
      //   .int()
      //   .primary()
      //   .unsigned()
      //   .autoIncrement()
      //   .fieldName('uid');
      table.autoIncrementHashId('userId');
      table
        .column('name')
        .varchar(20)
        .default('no name')
        .notNull()
        .fieldName('NNN');
      table
        .column('nickName')
        .varchar(20)
        .nullable()
        .unique()
        .fieldName('nick');
      table.createdAt().updatedAt();
      table.enableGQL();
      table.addGQLQuery(
        Queries.primary(['testMiddleware']),
        Queries.paging('users', {
          middlewares: ['testMiddleware', 't2Middleware'],
        }),
        Queries.single('www', {
          conditions: [
            Conditions.query.comparison(
              Conditions.value.fixed(1),
              '=',
              Conditions.value.arg('a1', 'Int'),
            ),
          ],
        }),
        Queries.listAll('la'),
        Queries.paging('p'),
      );
      table.addGQLMutation(
        Mutations.create({
          noRefetch: true,
          subscription: true,
          middlewares: ['testMiddleware', 'hoge'],
        }),
        Mutations.update({
          noRefetch: true,
          subscription: {
            enabled: true,
            subscriptionFilter: ['name'],
          },
        }),
      );
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('user');
  };
}
