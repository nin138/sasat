import {
  Queries,
  SasatMigration,
  MigrationStore,
  Conditions,
} from '../../src/index.js';
import { SqlString } from 'sasat/runtime/sql/sqlString.js';

const a = 'a';

console.log(SqlString.escape(a));

export default class CreateUser implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return store.createTable('user', table => {
      table
        .column('userId')
        .int()
        .primary()
        .unsigned()
        .autoIncrement()
        .fieldName('uid');
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
      table.setGQLOption({
        query: {
          list: 'paging',
          find: true,
        },
        queries: [
          Queries.single('www', [
            Conditions.query.comparison(
              Conditions.value.fixed(1),
              '=',
              Conditions.value.arg('a1', 'Int'),
            ),
          ]),
          Queries.listAll('la'),
          Queries.paging('p'),
        ],
      });
      table.setGQLCreate(true, { noReFetch: true, subscription: true });
      table.setGQLUpdate(true, {
        noReFetch: true,
        subscription: true,
        subscriptionFilter: ['name'],
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('user');
  };
}
