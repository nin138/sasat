import { MigrationStore, Relation, SasatMigration } from '../../src';

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
      table.setGqlOption({
        mutation: {
          delete: true,
          fromContextColumns: [{ column: 'user', contextName: 'userId' }],
        },
        subscription: { onDelete: true },
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('stock');
  };
}

new Stock();
