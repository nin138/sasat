import { builtInColumns } from '../../src';
import { DataStore, SasatMigration } from '../../src';

export class Stock implements SasatMigration {
  up: (store: DataStore) => void = store => {
    store.createTable('stock', table => {
      table.addBuiltInColumn(builtInColumns.autoIncrementPrimaryKey('id'));
      table.addReferences('user', 'user_id');
      table.addReferences('post', 'post_id');
      table.addBuiltInColumn(builtInColumns.created_at());
      table.addBuiltInColumn(builtInColumns.updated_at());
      table.addUniqueKey('user_id', 'post_id');
    });
  };
  down: (store: DataStore) => void = store => {
    store.dropTable('stock');
  };
}
