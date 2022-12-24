import { ContextNodeFactory } from './contextNodeFactory.js';
import { createCurrentMigrationDataStore } from '../../migration/exec/createCurrentMigrationDataStore.js';

/* eslint-disable */
describe('Parser', async () => {
  const parser = new ContextNodeFactory();
  const store = (await createCurrentMigrationDataStore(
    '20190921_172201stock.ts',
  )) as any;
  it('getContext', () => {
    expect(parser['create'](store.tables)).toStrictEqual([
      { name: 'userId', type: 'int' },
    ]);
  });
});
