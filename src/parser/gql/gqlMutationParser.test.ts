import { GqlMutationParser } from './gqlMutationParser';
import { testStoreHandler } from '../../../test/testDataStore';
import { TableHandler } from '../../entity/table';

describe('GqlMutationParser', () => {
  const parser = new GqlMutationParser();
  const post = testStoreHandler.table('post') as TableHandler;
  it('getFromContextColumns', () => {
    expect(parser['getFromContextColumns'](post)).toStrictEqual([
      {
        columnName: 'userId',
        contextName: 'userId',
      },
    ]);
  });

  it('getOnCreateParams', () => {
    expect(parser['getOnCreateParams'](post)).toStrictEqual([
      {
        isArray: false,
        isNullable: true,
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
    ]);
  });

  it('getOnUpdateParams', () => {
    expect(parser['getOnUpdateParams'](post)).toStrictEqual([
      {
        isArray: false,
        isNullable: false,
        isReference: false,
        name: 'postId',
        type: 'Int',
      },
      {
        isArray: false,
        isNullable: true,
        isReference: false,
        name: 'title',
        type: 'String',
      },
    ]);
  });

  it('getOnDeleteParams', () => {
    expect(parser['getOnDeleteParams'](post)).toStrictEqual([
      {
        isArray: false,
        isNullable: false,
        isReference: false,
        name: 'postId',
        type: 'Int',
      },
    ]);
  });

  it('getSubscriptionSetting', () => {
    expect(parser['getSubscriptionSetting'](post)).toStrictEqual({
      filter: [],
      onCreate: false,
      onDelete: false,
      onUpdate: false,
    });
  });

  it('getPrimaryKeys', () => {
    expect(parser['getPrimaryKeys'](post)).toStrictEqual([
      {
        isArray: false,
        isNullable: false,
        isReference: false,
        name: 'postId',
        type: 'Int',
      },
    ]);
  });
});
