import { GqlPrimitive } from './types';
import { DBColumnTypes } from '../../migration/column/columnTypes';

export const columnTypeToGqlPrimitive = (type: DBColumnTypes) => {
  switch (type) {
    case DBColumnTypes.tinyInt:
    case DBColumnTypes.smallInt:
    case DBColumnTypes.mediumInt:
    case DBColumnTypes.int:
    case DBColumnTypes.bigInt:
    case DBColumnTypes.decimal:
    case DBColumnTypes.year:
      return GqlPrimitive.Int;
    case DBColumnTypes.float:
    case DBColumnTypes.double:
      return GqlPrimitive.Float;
    case DBColumnTypes.char:
    case DBColumnTypes.varchar:
    case DBColumnTypes.text:
    case DBColumnTypes.time:
    case DBColumnTypes.date:
    case DBColumnTypes.dateTime:
    case DBColumnTypes.timestamp:
      return GqlPrimitive.String;
    case DBColumnTypes.boolean:
      return GqlPrimitive.Boolean;
  }
};
