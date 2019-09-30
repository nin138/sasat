import { GqlPrimitive } from '../types';
import { SasatColumnTypes } from '../../../migration/column/columnTypes';

export const columnTypeToGqlPrimitive = (type: SasatColumnTypes) => {
  switch (type) {
    case SasatColumnTypes.tinyInt:
    case SasatColumnTypes.smallInt:
    case SasatColumnTypes.mediumInt:
    case SasatColumnTypes.int:
    case SasatColumnTypes.bigInt:
    case SasatColumnTypes.decimal:
    case SasatColumnTypes.year:
      return GqlPrimitive.Int;
    case SasatColumnTypes.float:
    case SasatColumnTypes.double:
      return GqlPrimitive.Float;
    case SasatColumnTypes.char:
    case SasatColumnTypes.varchar:
    case SasatColumnTypes.text:
    case SasatColumnTypes.time:
    case SasatColumnTypes.date:
    case SasatColumnTypes.dateTime:
    case SasatColumnTypes.timestamp:
      return GqlPrimitive.String;
    case SasatColumnTypes.boolean:
      return GqlPrimitive.Boolean;
  }
};
