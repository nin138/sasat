import { SasatMigration } from '../../src';
import { MigrationStore } from '../../src';

export class User implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    store.createTable('user', table => {
      table
        .column('user_id')
        .int()
        .primary()
        .unsigned()
        .autoIncrement();
      table
        .column('name')
        .varchar(20)
        .default('no name')
        .notNull();
      table
        .column('nick_name')
        .varchar(20)
        .nullable()
        .unique();
      table
        .column('created_at')
        .timestamp()
        .defaultCurrentTimeStamp()
        .notNull();
      table
        .column('updated_at')
        .timestamp()
        .defaultCurrentTimeStamp()
        .onUpdateCurrentTimeStamp()
        .notNull();
      table.setGqlOption({ subscription: { onCreate: true, onUpdate: true } });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('user');
  };
}
