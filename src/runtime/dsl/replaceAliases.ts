import {
  BetweenExpression,
  ComparisonExpression,
  CompoundExpression,
  ContainsExpression,
  Field,
  Fn,
  InExpression,
  IsNullExpression,
  Join,
  Literal,
  ParenthesisExpression,
  Query,
  QueryNode,
  QueryNodeKind,
  SelectExpr,
  QueryTable,
  Sort,
  NO_ALIAS,
} from './query/query.js';
import { TableInfo } from './query/createQueryResolveInfo.js';
import { getQueryTableName } from './query/sql/hydrate.js';

export const createAliasReplacer = (
  tableInfo: TableInfo,
  tableAliases: Record<string, string> = {},
): (<T extends QueryNode>(node: T) => T) => {
  const replaceAlias = <T extends QueryNode>(node: T): T => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<QueryNodeKind, (node: any) => typeof node> = {
      [QueryNodeKind.Field]: (node: Field): typeof node => {
        return {
          ...node,
          name:
            tableInfo[tableAliases[node.table]]?.columnMap[node.name] ||
            tableInfo[node.table]?.columnMap[node.name],
          alias: node.alias === NO_ALIAS ? undefined : node.alias || node.name,
        };
      },
      [QueryNodeKind.Function]: (node: Fn) => ({
        ...node,
        args: node.args.map(replaceAlias),
      }),
      [QueryNodeKind.Table]: (node: QueryTable) => {
        return {
          ...node,
          nameOrQuery:
            typeof node.nameOrQuery === 'string'
              ? node.nameOrQuery
              : replaceAliases(
                  {
                    ...node.nameOrQuery,
                    // select: node.nameOrQuery.select.map(it => ({...it, alia}))
                  },
                  tableInfo,
                ),
          joins: node.joins.map(replaceAlias),
        };
      },
      [QueryNodeKind.Join]: (node: Join) => ({
        ...node,
        table: replaceAlias(node.table),
        conditions: replaceAlias(node.conditions),
      }),
      [QueryNodeKind.CompoundExpr]: (node: CompoundExpression) => ({
        ...node,
        left: replaceAlias(node.left),
        right: replaceAlias(node.right),
      }),
      [QueryNodeKind.ComparisonExpr]: (node: ComparisonExpression) => ({
        ...node,
        left: replaceAlias(node.left),
        right: replaceAlias(node.right),
      }),
      [QueryNodeKind.IsNullExpr]: (node: IsNullExpression) => ({
        ...node,
        expr: replaceAlias(node.expr),
      }),
      [QueryNodeKind.Parenthesis]: (node: ParenthesisExpression) => ({
        ...node,
        expression: node.expression,
      }),
      [QueryNodeKind.InExpr]: (node: InExpression) => ({
        ...node,
        left: replaceAlias(node.left),
        right: node.right.map(replaceAlias),
      }),
      [QueryNodeKind.BetweenExpr]: (node: BetweenExpression) => ({
        ...node,
        left: replaceAlias(node.left),
        begin: replaceAlias(node.begin),
        end: replaceAlias(node.end),
      }),
      [QueryNodeKind.ContainsExpr]: (node: ContainsExpression) => ({
        ...node,
        left: replaceAlias(node.left),
      }),
      [QueryNodeKind.Literal]: (node: Literal) => node,
      [QueryNodeKind.Sort]: (node: Sort) => ({
        ...node,
        field: replaceAlias(node.field),
      }),
    };
    return map[node.kind](node);
  };
  return replaceAlias;
};

export const replaceAliases = (query: Query, tableInfo: TableInfo): Query => {
  const tableAliases: Record<string, string> = {};
  const addAlias = (table: QueryTable) => {
    tableAliases[table.alias] = getQueryTableName(table);
    table.joins.forEach(it => addAlias(it.table));
  };
  addAlias(query.from);
  const replaceAlias = createAliasReplacer(tableInfo, tableAliases);

  return {
    select: query.select
      .map(replaceAlias)
      .filter(it => it.kind !== QueryNodeKind.Field || it.name) as SelectExpr[],
    from: replaceAlias(query.from) as QueryTable,
    where: query.where ? replaceAlias(query.where) : undefined,
    sort: query.sort ? query.sort.map(replaceAlias) : undefined,
    limit: query.limit,
    offset: query.offset,
  };
};
