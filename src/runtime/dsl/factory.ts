import type { ComparisonOperators } from "../../db/sql/expression/comparison.js";
import { nonNullable } from "../util.js";
import {
  type BetweenExpression,
  type BooleanValueExpression,
  type ComparisonExpression,
  type CompoundOperator,
  type ContainType,
  type ExistsExpression,
  type Field,
  type Fn,
  type Identifier,
  type InExpression,
  type IsNullExpression,
  type Join,
  type JoinType,
  type Literal,
  type ParenthesisExpression,
  type Query,
  QueryNodeKind,
  type QueryTable,
  type RawExpression,
  type Sort,
  type SortDirection,
  type Value,
  type Window,
  type WindowContent,
} from "./query/query.js";

const compound = (
  expr: Array<BooleanValueExpression | undefined | null>,
  operator: CompoundOperator,
): BooleanValueExpression => {
  const active = expr.filter(nonNullable);
  if (active.length === 0) return conditions.eq(literal(1), literal(1));
  return active.reduce((acc, current) => ({
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
): BooleanValueExpression => compound(expr, "AND");
const or = (
  ...expr: Array<BooleanValueExpression | undefined | null>
): BooleanValueExpression => compound(expr, "OR");

const field = (table: string, name: string, alias?: string): Field => ({
  kind: QueryNodeKind.Field,
  table,
  name: name,
  alias,
});

const fn = (fnName: string, args: Value[], alias?: string): Fn => ({
  kind: QueryNodeKind.Function,
  fnName,
  args,
  alias,
});

const window = (type: "ROWS" | "RANGE", value: WindowContent): Window => ({
  kind: QueryNodeKind.Window,
  type,
  between: false,
  value,
});

const windowBetween = (
  type: "ROWS" | "RANGE",
  start: WindowContent,
  end: WindowContent,
): Window => ({
  kind: QueryNodeKind.Window,
  type,
  between: true,
  start,
  end,
});

const paren = (expression: BooleanValueExpression): ParenthesisExpression => ({
  kind: QueryNodeKind.Parenthesis,
  expression,
});

type StrOrNum = string | number;
const In = (
  left: Value,
  right: StrOrNum[] | Query | RawExpression,
): BooleanValueExpression => {
  if (Array.isArray(right)) {
    if (right.length === 0) return conditions.eq(literal(0), literal(1));
    return {
      kind: QueryNodeKind.InExpr,
      left,
      operator: "IN",
      right: right.map(literal),
    };
  }
  return {
    kind: QueryNodeKind.InExpr,
    left,
    operator: "IN",
    query: right,
  };
};

const notIn = (left: Value, values: StrOrNum[]): InExpression => ({
  kind: QueryNodeKind.InExpr,
  left,
  operator: "NOT IN",
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

const exists = (query: RawExpression | Query): ExistsExpression => ({
  kind: QueryNodeKind.Exists,
  query,
});

const raw = (sql: string): RawExpression => ({
  kind: QueryNodeKind.Raw,
  expr: sql,
});

const conditions = {
  simpleWhere,
  and,
  or,
  eq: comparison("="),
  neq: comparison("<>"),
  gt: comparison(">"),
  gte: comparison(">="),
  lt: comparison("<"),
  lte: comparison("<="),
  comparison: (left: Value, operator: ComparisonOperators, right: Value) =>
    comparison(operator)(left, right),
  contains: containsExpr(false, "contains"),
  notContains: containsExpr(true, "contains"),
  startsWith: containsExpr(false, "start"),
  notStartsWith: containsExpr(true, "start"),
  endsWith: containsExpr(false, "end"),
  notEndsWith: containsExpr(true, "end"),
  in: In,
  notIn,
  between,
  isNull: isNull(false),
  isNotNull: isNull(true),
  exists,
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

const sort = (
  field: Field | Fn | Identifier,
  direction?: SortDirection,
): Sort => ({
  kind: QueryNodeKind.Sort,
  field,
  direction,
});

const ident = (identifier: string): Identifier => ({
  kind: QueryNodeKind.Identifier,
  identifier,
});

export const QExpr = {
  conditions,
  ...conditions,
  field,
  fn,
  window,
  windowBetween,
  paren,
  table,
  subQueryTable,
  join,
  value: literal,
  sort,
  order: sort,
  ident,
  id: ident,
  raw,
} as const;
