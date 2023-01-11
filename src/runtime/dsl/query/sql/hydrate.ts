import { SqlValueType } from '../../../../db/connectors/dbClient.js';
import { SELECT_ALIAS_SEPARATOR } from './nodeToSql.js';

export type QueryResolveInfo = {
  tableAlias: string;
  isArray: boolean;
  keyAliases: string[];
  joins: QueryResolveInfo[];
  property: string;
};

export type ResultRow = Record<string, SqlValueType>;

type Entity = Record<string, unknown>;
type ParsedObjs = Record<string, Entity>;

const rowToObjs = (row: ResultRow): ParsedObjs => {
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

const getUnique = (obj: Entity, info: QueryResolveInfo) =>
  info.keyAliases.map(it => obj[it]).join('_~_');

const execTable = (
  info: QueryResolveInfo,
  objs: ParsedObjs,
  current?: Entity | Entity[],
) => {
  let entity: Record<string, unknown> | null = objs[info.tableAlias];
  if (entity[info.keyAliases[0]] == null) entity = null;
  let result: Entity | Entity[] | null;
  let currentTarget: Entity | null;
  if (info.isArray) {
    if (!current) {
      result = entity == null ? [] : [entity];
      currentTarget = entity;
    } else {
      currentTarget =
        entity == null
          ? null
          : (current as Entity[]).find(
              (item: Record<string, unknown>) =>
                item &&
                info.keyAliases.every(key => item[key] === entity![key]),
            )!;
      if (currentTarget) {
        result = current;
      } else {
        currentTarget = entity;
        result = current;
        if (currentTarget) (result as Entity[]).push(currentTarget);
      }
    }
  } else {
    currentTarget = (current as Entity | undefined) || entity;
    result = currentTarget;
  }
  if (currentTarget !== null) {
    info.joins.forEach(it => {
      currentTarget![it.property] = execTable(
        it,
        objs,
        currentTarget![it.property] as Entity | Entity[],
      );
    });
  }
  return result;
};

/**
 * to use this function require to select primary keys for every table
 */
export const hydrate = (
  data: ResultRow[],
  info: QueryResolveInfo,
): unknown[] => {
  const result: Record<string, unknown>[] = [];
  // Record<uniqueValue, index of result>
  const t0mapper: Record<string, number> = {};
  info.isArray = false; // TODO skip t0 mapper & getUnique when isArray = false;
  data.forEach(row => {
    const objs: ParsedObjs = rowToObjs(row);
    const currentObj = objs[info.tableAlias];
    const unique = getUnique(currentObj, info);

    if (t0mapper[unique] === undefined) {
      t0mapper[unique] = result.length;
      result.push(execTable(info, objs, currentObj) as Entity);
      return;
    }
    const base = result[t0mapper[unique]];
    execTable(info, objs, base);
  });

  return result;
};
