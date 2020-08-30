import { testStoreHandler } from '../../../test/testDataStore';
import { ContextNodeFactory } from './contextNodeFactory';

describe('Parser', () => {
  const parser = new ContextNodeFactory();
  it('getContext', () => {
    expect(parser['create'](testStoreHandler.tables)).toStrictEqual([{ name: 'userId', type: 'int' }]);
  });
});
