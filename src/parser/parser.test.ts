// @ts-ignore
import { testStoreHandler } from '../../test/testDataStore.test';
import { Parser } from './parser';
import { TableHandler } from '../entity/table';

describe('Parser', () => {
  describe('createEntity', () => {
    it('should ', () => {
      const parser = new Parser(testStoreHandler);

      const entity = parser['createEntity'](testStoreHandler.table('user')! as TableHandler);
      expect(entity.entityName).toBe('User');
      expect(entity.fields[0].fieldName).toBe('userId');
    });
  });
});
