import { GqlPrimitive } from './gqlTypes.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';

export const columnTypeToGqlPrimitive = (type: DBColumnTypes): GqlPrimitive => {
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
