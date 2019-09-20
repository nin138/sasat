import { builtInColumns } from '../../src/migration/column/builtInColumns';
import { DataStoreBuilder, SasatMigration } from '../../src';

export class Post implements SasatMigration {
  up: (store: DataStoreBuilder) => void = store => {
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
      table.addBuiltInColumn(builtInColumns.created_at());
      table.addBuiltInColumn(builtInColumns.updated_at());
      table.addIndex('i1', 'title');
      table.addForeignKey({
        constraintName: 'fk_user',
        columnName: 'user_id',
        referenceTable: 'user',
        referenceColumn: 'user_id',
      });
    });
  };
  down: (store: DataStoreBuilder) => void = store => {
    store.dropTable('post');
  };
}
