import {
  createSqlGenerator,
  type SqlGenerator,
} from "../../../../db/sqlGenerator.js";
import type { Join, LockMode, Query, QueryTable } from "../query.js";

const getJoin = (from: QueryTable): Join[] => {
  return from.joins.flatMap((join) => [join, ...getJoin(join.table)]);
};

const getLock = (lock?: LockMode): string => {
  if (!lock) return "";
  if (lock === "FOR UPDATE") return " FOR UPDATE";
  return " FOR SHARE";
};

/** Shared renderer. Visit clauses in SQL order so positional binds stay aligned. */
export const renderQuery = (
  query: Query,
  generator: SqlGenerator,
  Sql = generator.nodes,
  paginationValue: (value: number) => string = String,
): string => {
  const SqlString = generator;
  const select = query.select.map(Sql.select).join(", ");
  const from = Sql.table(query.from);
  const join = [...getJoin(query.from), ...(query.join ?? [])]
    .map(Sql.join)
    .join(" ");
  const where = query.where ? " WHERE " + Sql.booleanValue(query.where) : "";
  const groupBy = query.groupBy
    ? " GROUP BY " + query.groupBy.cols.map(Sql.value).join(",")
    : "";
  const having = query.having
    ? " HAVING " + Sql.booleanValue(query.having)
    : "";
  const sort =
    query.sort && query.sort.length !== 0
      ? " ORDER BY " + Sql.sorts(query.sort)
      : "";
  for (const [name, value] of [
    ["LIMIT", query.limit],
    ["OFFSET", query.offset],
  ] as const) {
    if (value != null && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(name + " must be a non-negative safe integer");
    }
  }
  const limit =
    query.limit != null ? " LIMIT " + paginationValue(query.limit) : "";
  const offset = query.offset ? " OFFSET " + paginationValue(query.offset) : "";
  if (offset && !limit) throw new Error("LIMIT is required to use OFFSET.");
  return (
    `SELECT ${select} FROM ${from}` +
    (join ? " " + join : "") +
    where +
    groupBy +
    having +
    sort +
    limit +
    offset +
    getLock(query.lock) +
    (query.lock && generator.dialect === "postgres"
      ? " OF " + SqlString.escapeId(query.from.alias)
      : "")
  );
};

export const queryToSql = (
  query: Query,
  generator: SqlGenerator = createSqlGenerator(),
): string => renderQuery(query, generator);
