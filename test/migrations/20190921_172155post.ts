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
        columnName: 'uId',
        relationName: 'hoge',
        parentColumn: 'userId',
        parentTable: 'user',
        parentFieldName: 'uPost',
        fieldName: 'pUser',
        relation: 'Many',
      });
      table.enableGQL();
      table.column('title').varchar(50).notNull();
      table.setGQLCreate(true).setGQLUpdate(true).setGQLContextColumn([]);
      table.addVirtualRelation({
        parentTable: 'user',
        parentFieldName: false,
        childFieldName: 'vC',
        conditions: [
          {
            left: { type: 'parent', field: 'uid' },
            right: {
              type: 'context',
              field: 'vv',
              // onNotDefined: { action: 'error', message: 'aaaaaaww' },
              onNotDefined: { action: 'defaultValue', value: 'ww' },
            },
            operator: '=',
          },
          {
            left: {
              type: 'context',
              field: 'uid',
              onNotDefined: { action: 'error', message: 'eee' },
            },
            operator: 'BETWEEN',
            right: {
              type: 'date',
              range: 'today',
            },
          },
        ],
        relation: 'Many',
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('post');
  };
}
