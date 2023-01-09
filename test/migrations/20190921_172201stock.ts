import { MigrationStore, SasatMigration } from '../../src/index.js';

export default class Stock implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return store.createTable('stock', table => {
      table.column('id').int().unsigned();
      table.references({
        parentTable: 'user',
        parentColumn: 'userId',
        relationName: 'stock_user',
        columnName: 'user',
        relation: 'Many',
      });
      table.references({
        // relationName: 'stockPost',
        parentTable: 'post',
        parentColumn: 'postId',
        columnName: 'post',
        relation: 'Many',
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      table.setPrimaryKey('id');
      table.createdAt();
      table.updatedAt();
      table.addUniqueKey('user', 'post');
      table.setGQLCreate(true, { noReFetch: false });
      table.setGQLUpdate(true, { noReFetch: false });
      table.setGQLDelete(true, { subscription: true });
      // .setGQLContextColumn([{ column: 'user', contextName: 'userId' }]);
      table.setGQLOption({
        enabled: true,
        query: { list: 'all', find: true },
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('stock');
  };
}
