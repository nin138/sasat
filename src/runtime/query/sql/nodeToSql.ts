import {
  BetweenExpression,
  BooleanValueExpression,
  ComparisonExpression,
  CompoundExpression,
  ContainsExpression,
  ContainType,
  Field,
  Fn,
  InExpression,
  IsNullExpression,
  Join,
  Literal,
  ParenthesisExpression,
  QueryNodeKind,
  SelectExpr,
  Table,
  Value,
} from '../query';

import { SqlString } from './sqlString';
export const SELECT_ALIAS_SEPARATOR = '__';
export const Sql = {
  select: (select: SelectExpr): string => {
    if (select.kind === QueryNodeKind.Field) return Sql.field(select);
    return Sql.fn(select);
  },

  literal: (literal: Literal): string => SqlString.escape(literal.value),
  field: (identifier: Field): string => {
    return (
      SqlString.escapeId(identifier.table) +
      '.' +
      SqlString.escapeId(identifier.name) +
      ' AS ' +
      SqlString.escapeId(identifier.table + SELECT_ALIAS_SEPARATOR + identifier.name)
    );
  },
  fn: (fn: Fn): string => `${fn.fnName}(${fn.args.map(Sql.value).join(',')})`,
  value: (v: Value): string => {
    if (v.kind === QueryNodeKind.Function) return Sql.fn(v);
    if (v.kind === QueryNodeKind.Field) return Sql.field(v);
    return Sql.literal(v);
  },
  selectExpr: (expr: SelectExpr): string => (expr.kind === QueryNodeKind.Field ? Sql.field(expr) : Sql.fn(expr)),
  between: (expr: BetweenExpression): string =>
    `${Sql.value(expr.left)} BETWEEN ${Sql.value(expr.begin)} AND ${Sql.value(expr.end)}`,
  contains: (expr: ContainsExpression): string => {
    const operator = expr.isNot ? 'NOT LIKE' : 'LIKE';
    const val = (value: string, type: ContainType) => {
      if (type === 'contains') return '%' + value + '%';
      if (type === 'start') return '%' + value;
      return value + '%';
    };
    return `${Sql.value(expr.left)} ${operator} ${SqlString.escape(val(expr.right, expr.type))}`;
  },
  in: (expr: InExpression): string =>
    `${Sql.value(expr.left)} ${expr.operator} (${expr.right.map(Sql.value).join(', ')})`,
  comparison: (expr: ComparisonExpression): string =>
    `${Sql.value(expr.left)}  ${expr.operator} ${Sql.value(expr.right)}`,
  compound: (expr: CompoundExpression): string =>
    `${Sql.booleanValue(expr.left)}  ${expr.operator} ${Sql.booleanValue(expr.right)}`,
  isNull: (expr: IsNullExpression): string => `${Sql.value(expr.expr)} ${expr.isNot ? 'IS NOT NULL' : 'IS NULL'}`,
  paren: (expr: ParenthesisExpression): string => '(' + Sql.booleanValue(expr) + ')',
  table: (table: Table): string => {
    if (!table.alias) return SqlString.escapeId(table.name);
    return SqlString.escapeId(table.name) + ' AS ' + SqlString.escapeId(table.alias);
  },
  join: (join: Join): string =>
    `${join.type ? join.type + ' ' : ''}JOIN ${Sql.table(join.table)} ON ` + Sql.booleanValue(join.conditions),
  booleanValue: (expr: BooleanValueExpression): string => {
    switch (expr.kind) {
      case QueryNodeKind.BetweenExpr:
        return Sql.between(expr);
      case QueryNodeKind.CompoundExpr:
        return Sql.compound(expr);
      case QueryNodeKind.ComparisonExpr:
        return Sql.comparison(expr);
      case QueryNodeKind.ContainsExpr:
        return Sql.contains(expr);
      case QueryNodeKind.Parenthesis:
        return Sql.paren(expr);
      case QueryNodeKind.InExpr:
        return Sql.in(expr);
      case QueryNodeKind.IsNullExpr:
        return Sql.isNull(expr);
    }
  },
};
