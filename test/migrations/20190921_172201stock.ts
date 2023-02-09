import {
  MigrationStore,
  SasatMigration,
  Queries,
  Mutations,
} from '../../src/index.js';

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
      table.addGQLMutation(
        Mutations.create(),
        Mutations.update(),
        Mutations.delete({ subscription: true }),
      );
      // .setGQLContextColumn([{ column: 'user', contextName: 'userId' }]);
      table.setGQLOption({
        queries: [Queries.primary(), Queries.listAll('stocks')],
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('stock');
  };
}
