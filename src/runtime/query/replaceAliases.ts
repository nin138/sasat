import {
  BetweenExpression,
  BooleanValueExpression,
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
  Table,
} from './query';
import { TableInfo } from './createQueryResolveInfo';

export const replaceAliases = (query: Query, tableInfo: TableInfo): Query => {
  const tableAliases: Record<string, string> = {};
  const addAlias = (table: Table) => {
    tableAliases[table.alias || table.name] = table.name;
    table.joins.forEach(it => addAlias(it.table));
  };
  addAlias(query.from);
  const replaceAlias = (node: QueryNode): typeof node => {
    const map: Record<any, (node: any) => typeof node> = {
      [QueryNodeKind.Field]: (node: Field): typeof node => {
        return {
          ...node,
          name: tableInfo[tableAliases[node.table]].columnMap[node.name] || node.name,
          alias: node.alias || node.name,
        };
      },
      [QueryNodeKind.Function]: (node: Fn) => ({ ...node, args: node.args.map(replaceAlias) }),
      [QueryNodeKind.Table]: (node: Table) => ({ ...node, joins: node.joins.map(replaceAlias) }),
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
      [QueryNodeKind.IsNullExpr]: (node: IsNullExpression) => ({ ...node, expr: replaceAlias(node.expr) }),
      [QueryNodeKind.Parenthesis]: (node: ParenthesisExpression) => ({ ...node, expression: node.expression }),
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
      [QueryNodeKind.ContainsExpr]: (node: ContainsExpression) => ({ ...node, left: replaceAlias(node.left) }),
      [QueryNodeKind.Literal]: (node: Literal) => node,
    };
    return map[node.kind](node);
  };

  return {
    select: query.select.map(replaceAlias) as SelectExpr[],
    from: replaceAlias(query.from) as Table,
    where: query.where ? (replaceAlias(query.where) as BooleanValueExpression) : undefined,
    limit: query.limit,
    offset: query.offset,
  };
};
