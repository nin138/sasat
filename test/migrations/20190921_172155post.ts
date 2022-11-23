import { MigrationStore, SasatMigration } from '../../src';

export default class Post implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return store.createTable('post', table => {
      table
        .column('postId')
        .int()
        .unsigned()
        .autoIncrement()
        .primary()
        .fieldName('pid');
      table.references({
        columnName: 'userId',
        relationName: 'hoge',
        targetColumn: 'userId',
        targetTable: 'user',
        relation: 'Many',
      });
      table.column('title').varchar(50).notNull();
      table.setGQLCreate(true).setGQLUpdate(true).setGQLContextColumn([]);
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('post');
  };
}
