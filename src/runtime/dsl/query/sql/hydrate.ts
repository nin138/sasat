import type { SqlValueType } from "../../../../db/connectors/dbClient.js";
import { SELECT_ALIAS_SEPARATOR } from "./nodeToSql.js";

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
type ChildIndexes = WeakMap<Entity[], Map<unknown, Entity>>;

const rowToObjs = (row: ResultRow): ParsedObjs => {
  const objs: Record<string, ResultRow> = {};
  for (const [key, value] of Object.entries(row)) {
    const [table, column] = key.split(SELECT_ALIAS_SEPARATOR);
    if (!objs[table]) {
      objs[table] = {};
    }
    objs[table][column] = value;
  }
  return objs;
};

const getUnique = (obj: Entity, info: QueryResolveInfo) =>
  info.keyAliases.length === 1
    ? obj[info.keyAliases[0]]
    : JSON.stringify(info.keyAliases.map((key) => obj[key]));

const execTable = (
  info: QueryResolveInfo,
  objs: ParsedObjs,
  childIndexes: ChildIndexes,
  current?: Entity | Entity[],
) => {
  let entity: Record<string, unknown> | null = objs[info.tableAlias];
  if (entity[info.keyAliases[0]] == null) entity = null;
  let result: Entity | Entity[] | null;
  let currentTarget: Entity | null;
  if (info.isArray) {
    result = (current as Entity[] | undefined) ?? [];
    currentTarget = null;
    if (entity !== null) {
      // Each relation array owns its index, so equal child IDs in other parents
      // or sibling relations cannot share hydrated entities.
      let index = childIndexes.get(result);
      if (!index) {
        index = new Map();
        childIndexes.set(result, index);
      }
      const unique = getUnique(entity, info);
      currentTarget = index.get(unique) ?? null;
      if (currentTarget === null) {
        currentTarget = entity;
        index.set(unique, entity);
        result.push(entity);
      }
    }
  } else {
    currentTarget = (current as Entity | undefined) || entity;
    result = currentTarget;
  }
  if (currentTarget !== null) {
    for (const it of info.joins) {
      currentTarget![it.property] = execTable(
        it,
        objs,
        childIndexes,
        currentTarget![it.property] as Entity | Entity[],
      );
    }
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
  // A single-column key keeps its SQL value; composite keys use JSON tuples.
  const t0mapper = new Map<unknown, number>();
  const childIndexes: ChildIndexes = new WeakMap();
  info.isArray = false; // TODO skip t0 mapper & getUnique when isArray = false;
  for (const row of data) {
    const objs: ParsedObjs = rowToObjs(row);
    const currentObj = objs[info.tableAlias];
    const unique = getUnique(currentObj, info);

    const index = t0mapper.get(unique);
    if (index === undefined) {
      t0mapper.set(unique, result.length);
      result.push(execTable(info, objs, childIndexes, currentObj) as Entity);
      continue;
    }
    const base = result[index];
    execTable(info, objs, childIndexes, base);
  }

  return result;
};
