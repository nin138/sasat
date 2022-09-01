import { SasatMigration } from '../../src';
import { MigrationStore } from '../../src';

class CreateUser implements SasatMigration {
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
      table.setGqlCreate(true, { noReFetch: true, subscription: true });
      table.setGqlUpdate(true, {
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
new CreateUser();
