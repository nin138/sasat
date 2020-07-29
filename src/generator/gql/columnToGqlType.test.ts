import { columnTypeToGqlPrimitive } from './columnToGqlType';
import { DBColumnTypes } from '../../migration/column/columnTypes';
import { GqlPrimitive } from './types';

describe('columnToGqlPrimitive', () => {
  it('int', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.int)).toBe(GqlPrimitive.Int);
  });
  it('string', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.varchar)).toBe(GqlPrimitive.String);
  });
  it('boolean', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.boolean)).toBe(GqlPrimitive.Boolean);
  });
  it('float', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.double)).toBe(GqlPrimitive.Float);
  });
});
