import { testStoreHandler } from '../../../test/testDataStore';
import { TableHandler } from '../../entity/table';
import { GqlResolverParser } from './gqlResolverParser';
import { ReferenceColumn } from '../../entity/referenceColumn';

describe('GqlResolverParser', () => {
  const parser = new GqlResolverParser();
  const post = testStoreHandler.table('post') as TableHandler;
  const userId = post.column('userId') as ReferenceColumn;
  it('listQuery', () => {
    expect(parser['createChildResolver'](userId, 'user')).toStrictEqual({
      __type: 'child',
      currentColumn: 'userId',
      currentEntity: 'User',
      functionName: 'findByUserId',
      gqlReferenceName: 'post',
      parentColumn: 'userId',
      parentEntity: 'User',
    });
  });

  it('primaryQuery', () => {
    expect(parser['createParentResolver'](userId, 'user')).toStrictEqual({
      __type: 'parent',
      currentColumn: 'userId',
      currentEntity: 'User',
      functionName: 'findByUserId',
      gqlReferenceName: 'user',
      parentColumn: 'userId',
      parentEntity: 'User',
    });
  });
});
