import { Parser } from './parser';
import { testStoreHandler } from '../../test/testDataStore';
import { GqlParser } from './gqlParser';
import { GqlPrimitive } from '../generator/gql/types';

describe('Parser', () => {
  const parser = new GqlParser(testStoreHandler);
  it('getContext', () => {
    expect(parser['getContext']()).toStrictEqual([
      { name: 'userId', type: 'int' },
      { name: 'userId', type: 'int' },
    ]);
  });
});
