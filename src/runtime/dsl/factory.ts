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
  ParenthesisExpression,
  Query,
  QueryNodeKind,
  QueryTable,
  Sort,
  SortDirection,
  Value,
} from './query/query.js';
import { ComparisonOperators } from '../../db/sql/expression/comparison.js';
import { nonNullable } from '../util.js';

const compound = (
  expr: Array<BooleanValueExpression | undefined | null>,
  operator: CompoundOperator,
): BooleanValueExpression => {
  return expr.filter(nonNullable).reduce((acc, current) => ({
    kind: QueryNodeKind.CompoundExpr,
    left: acc,
    operator: operator,
    right: current,
  }));
};

const containsExpr =
  (isNot: boolean, type: ContainType) =>
  (left: Value, right: string): BooleanValueExpression => ({
    kind: QueryNodeKind.ContainsExpr,
    type,
    left,
    isNot,
    right,
  });

const comparison =
  (operator: ComparisonOperators) =>
  (left: Value, right: Value): ComparisonExpression => ({
    kind: QueryNodeKind.ComparisonExpr,
    left,
    operator,
    right,
  });

const and = (
  ...expr: Array<BooleanValueExpression | undefined | null>
): BooleanValueExpression => compound(expr, 'AND');
const or = (
  ...expr: Array<BooleanValueExpression | undefined | null>
): BooleanValueExpression => compound(expr, 'OR');

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

const isNull =
  (isNot: boolean) =>
  (expr: Value): IsNullExpression => ({
    kind: QueryNodeKind.IsNullExpr,
    expr,
    isNot,
  });

const simpleWhere = (
  tableNameOrAlias: string,
  where: { [field: string]: ValueType | [ComparisonOperators, ValueType] },
  isOr = false,
) => {
  const compound = isOr ? or : and;
  return compound(
    ...Object.entries(where).map(([f, value]) => {
      const fe = field(tableNameOrAlias, f);
      if (Array.isArray(value))
        return comparison(value[0])(fe, literal(value[1]));
      return conditions.eq(fe, literal(value));
    }),
  );
};

const conditions = {
  simpleWhere,
  and,
  or,
  eq: comparison('='),
  neq: comparison('<'),
  gt: comparison('>'),
  gte: comparison('>='),
  lt: comparison('<'),
  lte: comparison('<='),
  comparison: (left: Value, operator: ComparisonOperators, right: Value) =>
    comparison(operator)(left, right),
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

const table = (name: string, joins: Join[], alias: string): QueryTable => ({
  kind: QueryNodeKind.Table,
  subquery: false,
  name,
  alias,
  joins,
});

const subQueryTable = (
  query: Query,
  joins: Join[],
  alias: string,
): QueryTable => ({
  kind: QueryNodeKind.Table,
  subquery: true,
  query,
  alias,
  joins,
});

const join = (
  table: QueryTable,
  conditions: BooleanValueExpression,
  type?: JoinType,
): Join => ({
  kind: QueryNodeKind.Join,
  type,
  table,
  conditions,
});

type ValueType = string | boolean | number | null;
const literal = (value: ValueType): Literal => ({
  kind: QueryNodeKind.Literal,
  value,
});

const sort = (field: Field | Fn, direction: SortDirection): Sort => ({
  kind: QueryNodeKind.Sort,
  field,
  direction,
});

export const QExpr = {
  conditions,
  ...conditions,
  field,
  fn,
  paren,
  table,
  subQueryTable,
  join,
  value: literal,
  sort,
  order: sort,
} as const;
