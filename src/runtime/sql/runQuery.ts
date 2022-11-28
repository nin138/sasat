import {
  BooleanValueExpression,
  Field,
  Query,
  QueryTable,
  Sort,
} from '../dsl/query/query.js';
import { SQLExecutor } from '../../db/connectors/dbClient.js';
import { RelationMap, TableInfo } from '../dsl/query/createQueryResolveInfo.js';
import { Fields } from '../field.js';
import { QExpr } from '../dsl/factory.js';
import { unique } from '../util.js';
import { queryToSql } from '../dsl/query/sql/queryToSql.js';
import {
  hydrate,
  QueryResolveInfo,
  ResultRow,
} from '../dsl/query/sql/hydrate.js';
import { SELECT_ALIAS_SEPARATOR } from '../dsl/query/sql/nodeToSql.js';
import { ListQueryOption, QueryOptions } from '../sasatDBDatasource.js';

const notTypeName = (fieldName: string) => fieldName !== '__typename';

export const createQuery = (
  baseTableName: string,
  fields: Fields,
  options: QueryOptions | undefined,
  tableInfo: TableInfo,
  relationMap: RelationMap,
  context?: any,
): Query => {
  let tableCount = 0;
  const select: Field[] = [];

  const resolveFields = (tableName: string, table: Fields): QueryTable => {
    const tableAlias = table.tableAlias || 't' + tableCount;
    table.tableAlias = tableAlias;
    tableCount++;
    const info = tableInfo[tableName];

    select.push(
      ...unique([
        ...(table.fields as string[]).filter(notTypeName),
        ...info.identifiableKeys,
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
      Object.entries(table.relations || {}).map(([relationName, table]) => {
        const current = tableCount;
        const rel = relationMap[tableName][relationName];
        return QExpr.join(
          resolveFields(rel.table, table!),
          rel.on(tableAlias, table!.tableAlias || 't' + current, context),
          'LEFT',
        );
      }),
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

type PagingOption = ListQueryOption & { where?: BooleanValueExpression };

export const createPagingInnerQuery = (
  tableName: string,
  tableAlias: string,
  fields: Fields,
  option: PagingOption,
  tableInfo: TableInfo,
): Query => {
  const map = tableInfo[tableName].columnMap;
  return {
    select: (fields.fields as string[])
      .filter(notTypeName)
      .map(it => QExpr.field(tableAlias, map[it])),
    from: QExpr.table(tableName, [], tableAlias),
    limit: option.numberOfItem,
    offset: option.offset,
    where: option.where,
    sort: option.order
      ? [
          QExpr.sort(
            QExpr.field(tableAlias, map[option.order]),
            option.asc ? 'ASC' : 'DESC',
          ),
        ]
      : undefined,
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
  fields: Fields;
  tableInfo: TableInfo;
  relationMap: RelationMap;
  queryOption?: QueryOptions;
  pagingOption: ListQueryOption & { where?: BooleanValueExpression };
  context?: any;
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
      nameOrQuery: innerQuery,
    },
  };
};
