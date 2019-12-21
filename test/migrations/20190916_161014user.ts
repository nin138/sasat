import { SasatMigration } from '../../src';
import { MigrationStore } from '../../src/migration/storeMigrator';

export class User implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    store.createTable('user', table => {
      table
        .column('user_id')
        .int()
        .primary()
        .unsigned();
      table
        .column('name')
        .varchar(20)
        .notNull();
      table
        .column('nick_name')
        .varchar(20)
        .notNull()
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
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('user');
  };
}
