import { isPrimary, TableInfo } from '../../../migration/table/tableInfo';
import { GqlPrimitive, GqlType } from '../types';
import { capitalizeFirstLetter } from '../../../util';
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

// TODO reference support
export const createGqlType = (table: TableInfo): GqlType => ({
  typeName: capitalizeFirstLetter(table.tableName),
  fields: table.columns.map(it => ({
    name: it.columnName,
    type: columnTypeToGqlPrimitive(it.type),
    nullable: !it.notNull && !isPrimary(it.columnName, table),
  })),
});
