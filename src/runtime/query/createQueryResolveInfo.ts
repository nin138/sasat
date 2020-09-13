import { QueryResolveInfo } from '../h2';
import { Fields } from '../resolveField';
import { BooleanValueExpression } from './query';

export type RelationInfo = {
  table: string;
  on: (parentTableAlias: string, childTableAlias: string) => BooleanValueExpression;
  relation: 'One' | 'OneOrZero' | 'Many';
};

export type RelationMap = {
  [from: string]: {
    [to: string]: RelationInfo;
  };
};

export type IdentifiableKeyMap = Record<string, string[]>;

export type ResolveMaps = {
  relation: RelationMap;
  identifiable: IdentifiableKeyMap;
};

const joinToQueryResolveInfo = (
  parentTableAlias: string,
  property: string,
  fields: Fields,
  map: RelationMap,
  identifiableKeyMap: IdentifiableKeyMap,
): QueryResolveInfo => {
  const info = map[parentTableAlias][property];
  const tableAlias = fields.tableAlias || info.table;
  return {
    tableAlias,
    isArray: info.relation === 'Many',
    keyAliases: identifiableKeyMap[info.table],
    joins: Object.entries(fields.relations || {})
      .filter(([, value]) => value)
      .map(([key, value]) => joinToQueryResolveInfo(info.table, key, value!, map, identifiableKeyMap)),
    property,
  };
};

export const createQueryResolveInfo = (
  tableName: string,
  fields: Fields,
  map: RelationMap,
  identifiableKeyMap: IdentifiableKeyMap,
): QueryResolveInfo => {
  const tableAlias = fields.tableAlias || tableName;
  return {
    tableAlias,
    isArray: true,
    keyAliases: identifiableKeyMap[tableName],
    joins: Object.entries(fields.relations || {})
      .filter(([, value]) => value)
      .map(([key, value]) => joinToQueryResolveInfo(tableName, key, value!, map, identifiableKeyMap)),
    property: '',
  };
};
