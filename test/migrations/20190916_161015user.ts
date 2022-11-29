import { SasatMigration } from '../../src';
import { MigrationStore } from '../../src';
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
        }
      })
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
