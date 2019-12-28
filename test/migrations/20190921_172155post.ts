import { MigrationStore, SasatMigration } from '../../src';

export class Post implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    store.createTable('post', table => {
      table
        .column('post_id')
        .int()
        .unsigned()
        .autoIncrement()
        .primary();
      table
        .column('user_id')
        .int()
        .notNull()
        .unsigned();
      table
        .column('title')
        .varchar(50)
        .notNull();
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('post');
  };
}
