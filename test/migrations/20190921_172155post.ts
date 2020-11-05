import { MigrationStore, Relation, SasatMigration } from '../../src';

export class Post implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return;
    store.createTable('post', table => {
      table.column('postId').int().unsigned().autoIncrement().primary().fieldName('pid');
      table.references({
        columnName: 'userId',
        relationName: 'hoge',
        targetColumn: 'userId',
        targetTable: 'user',
        relation: Relation.Many,
      });
      table.column('title').varchar(50).notNull();
      table.setGqlOption({
        mutation: {
          fromContextColumns: [{ column: 'userId', contextName: 'userId' }],
        },
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('post');
  };
}
