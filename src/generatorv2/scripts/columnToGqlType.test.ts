import { columnTypeToGqlPrimitive } from './columnToGqlType.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { GqlPrimitive } from './gqlTypes.js';

describe('columnToGqlPrimitive', () => {
  it('int', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.int)).toBe(GqlPrimitive.Int);
  });
  it('string', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.varchar)).toBe(
      GqlPrimitive.String,
    );
  });
  it('boolean', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.boolean)).toBe(
      GqlPrimitive.Boolean,
    );
  });
  it('float', () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.double)).toBe(
      GqlPrimitive.Float,
    );
  });
});
