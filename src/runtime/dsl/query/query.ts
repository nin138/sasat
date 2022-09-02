import { ComparisonOperators } from '../../../db/sql/expression/comparison.js';

export enum QueryNodeKind {
  Field,
  Function,
  Table,
  Join,
  CompoundExpr,
  ComparisonExpr,
  IsNullExpr,
  Parenthesis,
  InExpr,
  BetweenExpr,
  ContainsExpr,
  Literal,
  Sort,
}

export type Query = {
  select: Select;
  from: QueryTable;
  where?: BooleanValueExpression;
  sort?: Sort[];
  limit?: number;
  offset?: number;
};

type Select = SelectExpr[];

export type Field = {
  kind: QueryNodeKind.Field;
  table: string;
  name: string;
  alias?: string;
};

export type Fn = {
  kind: QueryNodeKind.Function;
  fnName: string;
  args: Value[];
};

export type SelectExpr = Field | Fn;

export type QueryTable = {
  kind: QueryNodeKind.Table;
  nameOrQuery: string | Query;
  alias: string;
  joins: Join[];
};

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'OUTER';
export type Join = {
  kind: QueryNodeKind.Join;
  type?: JoinType;
  table: QueryTable;
  conditions: BooleanValueExpression;
};

export type ParenthesisExpression = {
  kind: QueryNodeKind.Parenthesis;
  expression: BooleanValueExpression;
};

export type BooleanValueExpression =
  | CompoundExpression
  | ComparisonExpression
  | IsNullExpression
  | ParenthesisExpression
  | InExpression
  | BetweenExpression
  | ContainsExpression;

export type IsNullExpression = {
  kind: QueryNodeKind.IsNullExpr;
  expr: Value;
  isNot: boolean;
};

export type CompoundOperator = 'AND' | 'OR';
export type CompoundExpression = {
  kind: QueryNodeKind.CompoundExpr;
  left: BooleanValueExpression;
  operator: CompoundOperator;
  right: BooleanValueExpression;
};

export type ComparisonExpression = {
  kind: QueryNodeKind.ComparisonExpr;
  left: Value;
  operator: ComparisonOperators;
  right: Value;
};

export type ContainType = 'start' | 'end' | 'contains';
export type ContainsExpression = {
  kind: QueryNodeKind.ContainsExpr;
  type: ContainType;
  left: Value;
  isNot: boolean;
  right: string;
};

export type InExpression = {
  kind: QueryNodeKind.InExpr;
  left: Value;
  operator: 'IN' | 'NOT IN';
  right: Value[];
};

export type BetweenExpression = {
  kind: QueryNodeKind.BetweenExpr;
  left: Value;
  begin: Value;
  end: Value;
};

export type Value = Literal | Identifier | Fn;

type Identifier = Field;

export type Literal = {
  kind: QueryNodeKind.Literal;
  value: string | boolean | number | null;
};

export type SortDirection = 'ASC' | 'DESC';
export type Sort = {
  kind: QueryNodeKind.Sort;
  field: Field;
  direction: SortDirection;
};

export type QueryNode =
  | Field
  | Fn
  | QueryTable
  | Literal
  | BooleanValueExpression
  | Join
  | Sort;
