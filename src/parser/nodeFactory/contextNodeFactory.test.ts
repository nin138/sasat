import { testStoreHandler } from '../../../test/testDataStore.js';
import { ContextNodeFactory } from './contextNodeFactory.js';

describe('Parser', () => {
  const parser = new ContextNodeFactory();
  it('getContext', () => {
    expect(parser['create'](testStoreHandler.tables)).toStrictEqual([{ name: 'userId', type: 'int' }]);
  });
});
