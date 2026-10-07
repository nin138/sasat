import type { SQLExecutor } from "../../db/connectors/dbClient.js";
import { sqlFor } from "../../db/sqlGenerator.js";
import { QExpr } from "../dsl/factory.js";
import type {
  RelationMap,
  TableInfo,
} from "../dsl/query/createQueryResolveInfo.js";
import type {
  BooleanValueExpression,
  Field,
  Join,
  Query,
  QueryTable,
  Sort,
} from "../dsl/query/query.js";
import {
  hydrate,
  type QueryResolveInfo,
  type ResultRow,
} from "../dsl/query/sql/hydrate.js";
import { SELECT_ALIAS_SEPARATOR } from "../dsl/query/sql/nodeToSql.js";
import type { Fields } from "../field.js";
import type { QueryOptions } from "../sasatDBDatasource.js";
import { nonNullable, unique } from "../util.js";

const notTypeName = (fieldName: string) => fieldName !== "__typename";

export const createQuery = (
  baseTableName: string,
  // biome-ignore lint/suspicious/noExplicitAny: <>
  fields: Fields<any>,
  options: QueryOptions | undefined,
  tableInfo: TableInfo,
  relationMap: RelationMap,
  context?: unknown,
): Query => {
  let tableCount = 0;
  const select: Field[] = [];

  const resolveFields = (
    tableName: string,
    table: Fields<unknown>,
  ): QueryTable => {
    const tableAlias = table.tableAlias || "t" + tableCount;
    table.tableAlias = tableAlias;
    tableCount++;
    const info = tableInfo[tableName];

    select.push(
      ...unique([
        ...(table.fields as string[]).filter((it) => {
          return notTypeName(it) && info.columnMap[it];
        }),
        ...info.identifiableFields,
      ]).map((it) => {
        const realName = info.columnMap[it] || it;
        return QExpr.field(
          tableAlias,
          realName,
          tableAlias + SELECT_ALIAS_SEPARATOR + it,
        );
      }),
    );
    return QExpr.table(
      tableName,
      Object.entries(table.relations || {})
        .map(([relationName, table]: [string, Fields<unknown> | unknown]) => {
          const current = tableCount;
          const rel = relationMap[tableName][relationName];
          if (!rel) return undefined;
          return QExpr.join(
            resolveFields(rel.table, table as Fields<unknown>),
            QExpr.and(
              rel.condition({
                parentTableAlias: tableAlias,
                childTableAlias:
                  (table as Fields<unknown>).tableAlias || "t" + current,
                context,
              }),
              (table as Fields<unknown>).joinOn,
            ),
            (table as Fields<unknown>).joinType ?? "LEFT",
          );
        })
        .filter(nonNullable),
      tableAlias,
    );
  };
  const from = resolveFields(baseTableName, fields);

  return {
    select,
    from,
    ...options,
  };
};

export type PagingOption = {
  numberOfItem: number;
  where?: BooleanValueExpression;
  offset?: number; // TODO prev, next
  sort?: Sort[];
  join?: Join[];
};
export const createPagingInnerQuery = (
  tableName: string,
  tableAlias: string,
  fields: Fields<unknown>,
  option: PagingOption,
  tableInfo: TableInfo,
  relationMap: RelationMap,
): Query => {
  const map = tableInfo[tableName].columnMap;
  return {
    select: unique([
      ...tableInfo[tableName].identifiableKeys,
      ...Object.keys(fields.relations || {}).flatMap((key) => {
        return relationMap[tableName][key]?.requiredColumns || [];
      }),
      ...(fields.fields as string[])
        .filter((it) => notTypeName(it) && map[it])
        .map((it) => map[it] || it),
    ]).map((it) => QExpr.field(tableAlias, it)),
    from: QExpr.table(tableName, option.join || [], tableAlias),
    limit: option.numberOfItem,
    offset: option.offset,
    where: option.where,
    sort: option.sort,
  };
};

export const runQuery = async (
  client: SQLExecutor,
  query: Query,
  resolveInfo: QueryResolveInfo,
) => {
  const resultRows: ResultRow[] = await client.rawQuery(
    sqlFor(client).query(query),
  );
  return hydrate(resultRows, resolveInfo);
};

type CreatePagingFieldQueryArg = {
  baseTableName: string;
  fields: Fields<unknown>;
  tableInfo: TableInfo;
  relationMap: RelationMap;
  queryOption?: QueryOptions;
  pagingOption: PagingOption;
  context?: unknown;
};

export const createPagingFieldQuery = ({
  baseTableName,
  fields,
  queryOption,
  pagingOption,
  tableInfo,
  relationMap,
  context,
}: CreatePagingFieldQueryArg): Query => {
  const tableAlias = fields.tableAlias || "t0";

  const innerQuery: Query = createPagingInnerQuery(
    baseTableName,
    tableAlias,
    fields,
    {
      ...pagingOption,
      // Filter parents before LIMIT/OFFSET, including generated query conditions.
      where:
        queryOption?.where && pagingOption.where
          ? QExpr.and(queryOption.where, pagingOption.where)
          : (queryOption?.where ?? pagingOption.where),
      join: unique([
        ...(pagingOption.join ?? []),
        ...(queryOption?.join ?? []),
      ]),
      sort: pagingOption.sort ?? queryOption?.sort,
    },
    tableInfo,
    relationMap,
  );
  innerQuery.lock = queryOption?.lock;

  const main = createQuery(
    baseTableName,
    fields,
    queryOption,
    tableInfo,
    relationMap,
    context,
  );
  return {
    select: main.select,
    lock: queryOption?.lock,
    from: {
      ...main.from,
      subquery: true,
      query: innerQuery,
    },
  };
};
