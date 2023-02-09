import {
  MigrationStore,
  SasatMigration,
  Conditions,
  Queries,
} from '../../src/index.js';

export default class Post implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    return store.createTable('post', table => {
      table.autoIncrementHashId('postId');
      // table
      // .column('postId')
      //   .int()
      //   .unsigned()
      //   .autoIncrement()
      //   .primary()
      //   .fieldName('pid');
      table.references({
        columnName: 'uId',
        relationName: 'hoge',
        parentColumn: 'userId',
        parentTable: 'user',
        parentFieldName: 'uPost',
        fieldName: 'pUser',
        relation: 'Many',
      });
      table.column('title').varchar(50).notNull();
      table.enableGQL().setGQLOption({
        queries: [Queries.primary(), Queries.paging('posts')],
      });
      table.setGQLCreate(true).setGQLUpdate(true).setGQLContextColumn([]);
      table.addVirtualRelation({
        parentTable: 'user',
        parentFieldName: 'vP',
        childFieldName: 'vC',
        parentType: 'array',
        conditions: [
          // {
          //   left: { type: 'parent', field: 'uid' },
          //   right: {
          //     type: 'context',
          //     field: 'vv',
          //     // onNotDefined: { action: 'error', message: 'aaaaaaww' },
          //     onNotDefined: { action: 'defaultValue', value: 'ww' },
          //   },
          //   operator: '=',
          // },
          Conditions.custom('hoge', ['userId']),
          Conditions.rel.between(
            Conditions.value.parent('createdAt'),
            Conditions.range.today(),
          ),
        ],
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('post');
  };
}
