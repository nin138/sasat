import { SqlValueType } from '../../../../db/connectors/dbClient';
import { SELECT_ALIAS_SEPARATOR } from './nodeToSql';
import { Query, QueryNodeKind, QueryTable } from '../query';
import { TableInfo } from '../createQueryResolveInfo';
import { QExpr } from '../../factory';

export type QueryResolveInfo = {
  tableAlias: string;
  isArray: boolean;
  keyAliases: string[];
  joins: QueryResolveInfo[];
  property: string;
};

export type ResultRow = Record<string, SqlValueType>;

type ParseObjs = Record<string, Record<string, unknown>>;

const getUnique = (target: ResultRow, info: QueryResolveInfo) =>
  info.keyAliases.map(it => target[info.tableAlias + SELECT_ALIAS_SEPARATOR + it]).join('_~_');

const rowToObjs = (row: ResultRow): ParseObjs => {
  const objs: Record<string, ResultRow> = {};
  Object.entries(row).forEach(([key, value]) => {
    const [table, column] = key.split(SELECT_ALIAS_SEPARATOR);
    if (!objs[table]) {
      objs[table] = {};
    }
    objs[table][column] = value;
  });
  return objs;
};

const hydrateRow = (info: QueryResolveInfo, objs: ParseObjs) => {
  const result: Record<string, unknown> = objs[info.tableAlias];
  if (result[info.keyAliases[0]] === null) return null;
  info.joins.forEach(it => {
    if (it.isArray) {
      const child = hydrateRow(it, objs);
      result[it.property] = child ? [child] : [];
    } else {
      result[it.property] = hydrateRow(it, objs);
    }
  });
  return result;
};

const findAndAppend = (base: Record<string, unknown>, info: QueryResolveInfo, objs: ParseObjs): boolean => {
  if (info.isArray) {
    if (!base[info.property]) {
      base[info.property] = [hydrateRow(info, objs)];
      return true;
    }
    const tArr: Record<string, unknown>[] = base[info.property] as Record<string, unknown>[];
    const target = tArr.find(item => item && info.keyAliases.every(key => item[key] === objs[info.tableAlias][key]));
    if (!target) {
      tArr.push(hydrateRow(info, objs)!);
      return true;
    } else return info.joins.some(info => findAndAppend(target, info, objs));
  }
  if (base[info.property] !== undefined) return false;
  base[info.property] = hydrateRow(info, objs);
  return true;
};

/**
 * to use this function require to select primary keys for every table
 */
export const hydrate = (data: ResultRow[], info: QueryResolveInfo): unknown[] => {
  const result: Record<string, unknown>[] = [];
  // Record<uniqueValue, index of result>
  const t0mapper: Record<string, number> = {};

  data.forEach(row => {
    const unique = getUnique(row, info);
    const objs: Record<string, Record<string, unknown>> = rowToObjs(row);
    if (t0mapper[unique] === undefined) {
      t0mapper[unique] = result.length;
      result.push(hydrateRow(info, objs)!);
      return;
    }
    const base = result[t0mapper[unique]];
    info.joins.some(info => findAndAppend(base, info, objs));
  });

  return result;
};

export const appendKeysToQuery = (query: Query, identifiableKeyMap: TableInfo): Query => {
  const getTables = (table: QueryTable): QueryTable[] => [table, ...table.joins.flatMap(it => getTables(it.table))];
  const tables = getTables(query.from);
  tables.forEach(table => {
    const keys = identifiableKeyMap[table.name].identifiableKeys;
    keys.forEach(key => {
      if (!query.select.some(it => it.kind === QueryNodeKind.Field && it.table === table.alias && it.name === key)) {
        query.select.push(
          QExpr.field(table.alias! || table.name, key, (table.alias || table.name) + SELECT_ALIAS_SEPARATOR + key),
        );
      }
    });
  });
  return query;
};
