import {
  BooleanValueExpression,
  Field,
  Join,
  Query,
  QueryTable,
  Sort,
} from '../dsl/query/query.js';
import { SQLExecutor } from '../../db/connectors/dbClient.js';
import { RelationMap, TableInfo } from '../dsl/query/createQueryResolveInfo.js';
import { Fields } from '../field.js';
import { QExpr } from '../dsl/factory.js';
import { nonNullable, unique } from '../util.js';
import { queryToSql } from '../dsl/query/sql/queryToSql.js';
import {
  hydrate,
  QueryResolveInfo,
  ResultRow,
} from '../dsl/query/sql/hydrate.js';
import { SELECT_ALIAS_SEPARATOR } from '../dsl/query/sql/nodeToSql.js';
import { QueryOptions } from '../sasatDBDatasource.js';

const notTypeName = (fieldName: string) => fieldName !== '__typename';

export const createQuery = (
  baseTableName: string,
  fields: Fields<unknown>,
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
    const tableAlias = table.tableAlias || 't' + tableCount;
    table.tableAlias = tableAlias;
    tableCount++;
    const info = tableInfo[tableName];

    select.push(
      ...unique([
        ...(table.fields as string[]).filter(it => {
          return notTypeName(it) && info.columnMap[it];
        }),
        ...info.identifiableFields,
      ]).map(it => {
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
                  (table as Fields<unknown>).tableAlias || 't' + current,
                context,
              }),
              (table as Fields<unknown>).joinOn,
            ),
            'LEFT',
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
      ...Object.keys(fields.relations || {}).flatMap(key => {
        return relationMap[tableName][key]?.requiredColumns || [];
      }),
      ...(fields.fields as string[])
        .filter(it => notTypeName(it) && map[it])
        .map(it => map[it] || it),
    ]).map(it => QExpr.field(tableAlias, it)),
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
  const resultRows: ResultRow[] = await client.rawQuery(queryToSql(query));
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
  const tableAlias = fields.tableAlias || 't0';

  const innerQuery: Query = createPagingInnerQuery(
    baseTableName,
    tableAlias,
    fields,
    pagingOption,
    tableInfo,
    relationMap,
  );

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
    from: {
      ...main.from,
      subquery: true,
      query: innerQuery,
    },
  };
};
