import { MigrationStore, SasatMigration } from '../../src';

class Stock implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return store.createTable('stock', table => {
      table.column('id').int().unsigned();
      table.references({
        targetTable: 'user',
        targetColumn: 'userId',
        relationName: 'stock_user',
        columnName: 'user',
        relation: 'Many',
      });
      table.references({
        // relationName: 'stockPost',
        targetTable: 'post',
        targetColumn: 'postId',
        columnName: 'post',
        relation: 'Many',
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      table.setPrimaryKey('id');
      table.createdAt();
      table.updatedAt();
      table.addUniqueKey('user', 'post');
      table.setGqlCreate(true, { noReFetch: false });
      table.setGqlUpdate(true, { noReFetch: false });
      table
        .setGqlDelete(true, { subscription: true })
        .setGqlContextColumn([{ column: 'user', contextName: 'userId' }]);
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('stock');
  };
}

new Stock();
