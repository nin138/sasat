import { testStoreHandler } from '../../../test/testDataStore';
import { TableHandler } from '../../entity/table';
import { GqlTypeParser } from './gqlTypeParser';
import { GqlPrimitive } from '../../generator/gql/types';
import { ReferenceColumn } from '../../entity/referenceColumn';

describe('GqlTypeParser', () => {
  const parser = new GqlTypeParser();
  const post = testStoreHandler.table('post') as TableHandler;
  const postId = post.column('postId');

  it('referenceToParam', () => {
    const userId = post.column('userId') as ReferenceColumn;
    expect(GqlTypeParser['referenceToParam'](userId)).toStrictEqual({
      name: 'user',
      type: 'User',
      isNullable: false,
      isArray: false,
      isReference: true,
    });
  });

  it('columnToParam', () => {
    expect(parser['columnToParam'](postId!)).toStrictEqual({
      name: 'postId',
      type: GqlPrimitive.Int,
      isNullable: false,
      isArray: false,
      isReference: false,
    });
  });

  it('getReferencedType', () => {
    expect(parser['getReferencedType'](testStoreHandler, 'user')).toStrictEqual([
      {
        isArray: true,
        isNullable: false,
        isReference: true,
        name: 'post',
        type: 'Post',
      },
      {
        isArray: true,
        isNullable: false,
        isReference: true,
        name: 'stock',
        type: 'Stock',
      },
    ]);
  });

  it('getType', () => {
    expect(parser['getType'](testStoreHandler, post)).toStrictEqual({
      params: [
        {
          isArray: false,
          isNullable: false,
          isReference: false,
          name: 'userId',
          type: 'Int',
        },
        {
          isArray: false,
          isNullable: false,
          isReference: false,
          name: 'postId',
          type: 'Int',
        },
        {
          isArray: false,
          isNullable: false,
          isReference: false,
          name: 'title',
          type: 'String',
        },
        {
          isArray: false,
          isNullable: false,
          isReference: true,
          name: 'user',
          type: 'User',
        },
        {
          isArray: true,
          isNullable: false,
          isReference: true,
          name: 'stock',
          type: 'Stock',
        },
      ],
      typeName: 'Post',
    });
  });

  it('getType', () => {
    expect(parser['getDeletedType'](post)).toStrictEqual({
      params: [
        {
          isArray: false,
          isNullable: false,
          isReference: false,
          name: 'postId',
          type: 'Int',
        },
        {
          isArray: false,
          isNullable: false,
          isReference: true,
          name: 'user',
          type: 'User',
        },
      ],
      typeName: 'DeletedPost',
    });
  });
});
