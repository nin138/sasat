import { BooleanValueExpression } from './query.js';
import { QueryResolveInfo } from './sql/hydrate.js';
import { Fields } from '../../field.js';
import { nonNullable } from '../../util.js';

export type MakeConditionArg<Context = unknown, Entity = unknown> = {
  childTableAlias: string;
  context?: Context;
} & (
  | {
      parentTableAlias: string;
      parent?: undefined;
    }
  | {
      parent: Partial<Entity>;
      parentTableAlias?: undefined;
    }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MakeCondition<Context, Entity = any> = (
  arg: MakeConditionArg<Context, Entity>,
) => BooleanValueExpression;

export type RelationInfo<Context = unknown> = {
  table: string;
  condition: MakeCondition<Context>;
  array: boolean;
  nullable: boolean;
  requiredColumns: string[];
};

export type RelationMap<Context = unknown> = {
  [from: string]: {
    [to: string]: RelationInfo<Context>;
  };
};

const joinToQueryResolveInfo = (
  parentTableAlias: string,
  property: string,
  fields: Fields<unknown>,
  map: RelationMap,
  tableInfo: TableInfo,
): QueryResolveInfo | undefined => {
  const info = map[parentTableAlias][property];
  if (!info) return undefined;
  const tableAlias = fields.tableAlias || info.table;
  return {
    tableAlias,
    isArray: info.array,
    keyAliases: tableInfo[info.table].identifiableFields,
    joins: Object.entries(fields.relations || {})
      .filter(([, value]) => value)
      .map(([key, value]) =>
        joinToQueryResolveInfo(
          info.table,
          key,
          value as Fields<unknown>,
          map,
          tableInfo,
        ),
      )
      .filter(nonNullable),
    property,
  };
};

export type TableInfo = {
  [tableName: string]: {
    identifiableKeys: string[];
    identifiableFields: string[];
    columnMap: { [fieldName: string]: string };
  };
};

export const createQueryResolveInfo = (
  tableName: string,
  fields: Fields<unknown>,
  map: RelationMap,
  tableInfo: TableInfo,
): QueryResolveInfo => {
  const tableAlias = fields.tableAlias || tableName;
  return {
    tableAlias,
    isArray: true,
    keyAliases: tableInfo[tableName].identifiableFields,
    joins: Object.entries(fields.relations || {})
      .filter(([, value]) => value)
      .map(([key, value]) =>
        joinToQueryResolveInfo(
          tableName,
          key,
          value as Fields<unknown>,
          map,
          tableInfo,
        ),
      )
      .filter(nonNullable),
    property: '',
  };
};
