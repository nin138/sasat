import { builtInColumns } from '../../src/migration/column/builtInColumns';
import { DataStoreBuilder, SasatMigration } from '../../src';

export class Stock implements SasatMigration {
  up: (store: DataStoreBuilder) => void = store => {
    store.createTable('stock', table => {
      table.addBuiltInColumn(builtInColumns.autoIncrementPrimaryKey('id'));
      table
        .column('user_id')
        .int()
        .notNull()
        .unsigned();
      table
        .column('post_id')
        .int()
        .notNull()
        .unsigned();
      table.addBuiltInColumn(builtInColumns.created_at());
      table.addBuiltInColumn(builtInColumns.updated_at());
      table.addUniqueKey('user_id', 'post_id');
      table.addForeignKey({
        constraintName: 'refuser',
        columnName: 'user_id',
        referenceTable: 'user',
        referenceColumn: 'user_id',
      });
      table.addForeignKey({
        constraintName: 'refpost',
        columnName: 'post_id',
        referenceTable: 'post',
        referenceColumn: 'post_id',
      });
    });
  };
  down: (store: DataStoreBuilder) => void = store => {
    store.dropTable('stock');
  };
}
