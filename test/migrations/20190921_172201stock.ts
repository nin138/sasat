import { MigrationStore } from '../../src';
import { SasatMigration } from '../../src';

export class Stock implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    store.createTable('stock', table => {
      table
        .column('id')
        .int()
        .autoIncrement()
        .unsigned()
        .primary();
      table.references('user', 'user_id');
      table.references('post', 'post_id');
      table.createdAt();
      table.updatedAt();
      table.addUniqueKey('user_id', 'post_id');
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('stock');
  };
}
