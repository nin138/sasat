import { BooleanValueExpression } from './query.js';
import { QueryResolveInfo } from './sql/hydrate.js';
import { Fields } from '../../field.js';

export type RelationInfo = {
  table: string;
  on: (
    parentTableAlias: string,
    childTableAlias: string,
    context?: any,
  ) => BooleanValueExpression;
  relation: 'One' | 'OneOrZero' | 'Many';
};

export type RelationMap = {
  [from: string]: {
    [to: string]: RelationInfo;
  };
};

const joinToQueryResolveInfo = (
  parentTableAlias: string,
  property: string,
  fields: Fields,
  map: RelationMap,
  tableInfo: TableInfo,
): QueryResolveInfo => {
  const info = map[parentTableAlias][property];
  const tableAlias = fields.tableAlias || info.table;
  return {
    tableAlias,
    isArray: info.relation === 'Many',
    keyAliases: tableInfo[info.table].identifiableKeys,
    joins: Object.entries(fields.relations || {})
      .filter(([, value]) => value)
      .map(([key, value]) =>
        joinToQueryResolveInfo(info.table, key, value!, map, tableInfo),
      ),
    property,
  };
};

export type TableInfo = {
  [tableName: string]: {
    identifiableKeys: string[];
    columnMap: { [fieldName: string]: string };
  };
};

export const createQueryResolveInfo = (
  tableName: string,
  fields: Fields,
  map: RelationMap,
  tableInfo: TableInfo,
): QueryResolveInfo => {
  const tableAlias = fields.tableAlias || tableName;
  return {
    tableAlias,
    isArray: true,
    keyAliases: tableInfo[tableName].identifiableKeys,
    joins: Object.entries(fields.relations || {})
      .filter(([, value]) => value)
      .map(([key, value]) =>
        joinToQueryResolveInfo(tableName, key, value!, map, tableInfo),
      ),
    property: '',
  };
};
