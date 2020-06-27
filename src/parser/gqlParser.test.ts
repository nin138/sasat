import { Parser } from './parser';
import { testStoreHandler } from '../../test/testDataStore';
import { GqlParser } from './gqlParser';
import { GqlPrimitive } from '../generator/gql/types';

describe('Parser', () => {
  const parser = new GqlParser(testStoreHandler);
  it('columnToParam', () => {
    const userName = testStoreHandler.table('user')!.column('name');
    expect(parser['columnToParam'](userName!)).toStrictEqual({
      name: 'name',
      type: GqlPrimitive.String,
      isNullable: false,
      isArray: false,
      isReference: false,
    });
  });
});
