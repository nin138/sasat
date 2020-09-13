import { ComparisonOperators } from '../..';
import {
  BooleanValueExpression,
  ContainType,
  QueryNodeKind,
  CompoundOperator,
  Literal,
  IsNullExpression,
  Value,
  ParenthesisExpression,
  Field,
  BetweenExpression,
  InExpression,
  ComparisonExpression,
  Fn,
  Table,
  Join,
  JoinType,
} from './query';

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

const field = (table: string, name: string): Field => ({
  kind: QueryNodeKind.Field,
  table,
  name,
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

const table = (name: string, joins: Join[], alias?: string): Table => ({
  kind: QueryNodeKind.Table,
  name,
  alias,
  joins,
});

const join = (table: Table, conditions: BooleanValueExpression, type?: JoinType): Join => ({
  kind: QueryNodeKind.Join,
  type,
  table,
  conditions,
});

const literal = (value: string | boolean | number | null): Literal => ({
  kind: QueryNodeKind.Literal,
  value,
});

export const QExpr = {
  conditions,
  field,
  fn,
  paren,
  table,
  join,
  value: literal,
};
