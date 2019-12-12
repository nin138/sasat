import { DataStore, SasatMigration } from '../../src';

export class User implements SasatMigration {
  up: (store: DataStore) => void = store => {
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
  down: (store: DataStore) => void = store => {
    store.dropTable('user');
  };
}
