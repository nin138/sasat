import { Parser } from './parser';
import { testStoreHandler } from '../../test/testDataStore';
import { GqlParser } from './gqlParser';

describe('Parser', () => {
  const parser = new GqlParser();
  it('getContext', () => {
    expect(parser['parse'](testStoreHandler)).toStrictEqual([
      { name: 'userId', type: 'int' },
      { name: 'userId', type: 'int' },
    ]);
  });
});
