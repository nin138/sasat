import { MigrationStore, SasatMigration } from '../../src';

export default class Stock implements SasatMigration {
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
      table.setGQLCreate(true, { noReFetch: false });
      table.setGQLUpdate(true, { noReFetch: false });
      table
        .setGQLDelete(true, { subscription: true })
        .setGQLContextColumn([{ column: 'user', contextName: 'userId' }]);
      table.setGQLOption({
        enabled: false,
        query: { list: 'all', find: true },
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('stock');
  };
}
