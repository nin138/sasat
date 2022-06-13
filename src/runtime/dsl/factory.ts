import {
  BetweenExpression,
  BooleanValueExpression,
  ComparisonExpression,
  CompoundOperator,
  ContainType,
  Field,
  Fn,
  InExpression,
  IsNullExpression,
  Join,
  JoinType,
  Literal,
  ParenthesisExpression, QueryNodeKind,
  QueryTable, Sort, SortDirection,
  Value,
} from './query/query.js';
import {ComparisonOperators} from '../../db/sql/expression/comparison.js';

const compound = (expr: BooleanValueExpression[], operator: CompoundOperator): BooleanValueExpression => {
  return expr.reduce((acc, current) => ({
    kind: QueryNodeKind.CompoundExpr,
    left: acc,
    operator: operator,
    right: current,
  }));
};

const containsExpr = (isNot: boolean, type: ContainType) => (left: Value, right: string): BooleanValueExpression => ({
  kind: QueryNodeKind.ContainsExpr,
  type,
  left,
  isNot,
  right,
});

const comparison = (operator: ComparisonOperators) => (left: Value, right: Value): ComparisonExpression => ({
  kind: QueryNodeKind.ComparisonExpr,
  left,
  operator,
  right,
});

const and = (...expr: BooleanValueExpression[]): BooleanValueExpression => compound(expr, 'AND');
const or = (...expr: BooleanValueExpression[]): BooleanValueExpression => compound(expr, 'OR');

const field = (table: string, name: string, alias?: string): Field => ({
  kind: QueryNodeKind.Field,
  table,
  name: name,
  alias,
});

const fn = (fnName: string, args: Value[]): Fn => ({
  kind: QueryNodeKind.Function,
  fnName,
  args,
});

const paren = (expression: BooleanValueExpression): ParenthesisExpression => ({
  kind: QueryNodeKind.Parenthesis,
  expression,
});

const In = (left: Value, values: (string | number)[]): InExpression => ({
  kind: QueryNodeKind.InExpr,
  left,
  operator: 'IN',
  right: values.map(literal),
});

const notIn = (left: Value, values: (string | number)[]): InExpression => ({
  kind: QueryNodeKind.InExpr,
  left,
  operator: 'NOT IN',
  right: values.map(literal),
});

const between = (left: Value, begin: Value, end: Value): BetweenExpression => ({
  kind: QueryNodeKind.BetweenExpr,
  left,
  begin,
  end,
});

const isNull = (isNot: boolean) => (expr: Value): IsNullExpression => ({
  kind: QueryNodeKind.IsNullExpr,
  expr,
  isNot,
});

const conditions = {
  and,
  or,
  eq: comparison('='),
  neq: comparison('<'),
  gt: comparison('>'),
  gte: comparison('>='),
  lt: comparison('<'),
  lte: comparison('<='),
  contains: containsExpr(false, 'contains'),
  notContains: containsExpr(true, 'contains'),
  statsWiths: containsExpr(false, 'start'),
  notStatsWiths: containsExpr(true, 'start'),
  endsWiths: containsExpr(false, 'end'),
  notEndsWiths: containsExpr(true, 'end'),
  In,
  notIn,
  between,
  isNull: isNull(false),
  isNotNull: isNull(true),
};

const table = (name: string, joins: Join[], alias?: string): QueryTable => ({
  kind: QueryNodeKind.Table,
  name,
  alias,
  joins,
});

const join = (table: QueryTable, conditions: BooleanValueExpression, type?: JoinType): Join => ({
  kind: QueryNodeKind.Join,
  type,
  table,
  conditions,
});

const literal = (value: string | boolean | number | null): Literal => ({
  kind: QueryNodeKind.Literal,
  value,
});

const sort = (field: Field, direction: SortDirection): Sort => ({
  kind: QueryNodeKind.Sort,
  field,
  direction,
})

export const QExpr = {
  conditions,
  field,
  fn,
  paren,
  table,
  join,
  value: literal,
  sort,
  order: sort,
} as const;
