import {
  BetweenExpression,
  BooleanValueExpression,
  ComparisonExpression,
  CompoundExpression,
  ContainsExpression,
  ContainType,
  ExistsExpression,
  Field,
  Fn,
  Identifier,
  InExpression,
  IsNullExpression,
  Join,
  Literal,
  ParenthesisExpression,
  Query,
  QueryNodeKind,
  QueryTable,
  RawExpression,
  SelectExpr,
  Sort,
  Value,
} from '../query.js';

import { SqlString } from '../../../../runtime/sql/sqlString.js';
import { queryToSql } from './queryToSql.js';

export const SELECT_ALIAS_SEPARATOR = '__';
export const Sql = {
  select: (expr: SelectExpr): string => {
    switch (expr.kind) {
      case QueryNodeKind.Field:
        return Sql.fieldInSelect(expr);
      case QueryNodeKind.Identifier:
        return Sql.identifier(expr);
      case QueryNodeKind.Function:
        return Sql.fn(expr);
    }
  },
  literal: (literal: Literal): string => SqlString.escape(literal.value),
  fieldInCondition: (identifier: Field): string =>
    SqlString.escapeId(identifier.table) +
    '.' +
    SqlString.escapeId(identifier.name),
  fieldInSelect: (identifier: Field): string => {
    const alias =
      identifier.alias && identifier.name !== identifier.alias
        ? ' AS ' + SqlString.escapeId(identifier.alias)
        : '';
    return (
      SqlString.escapeId(identifier.table) +
      '.' +
      SqlString.escapeId(identifier.name) +
      alias
    );
  },
  identifier: (ident: Identifier): string => {
    return SqlString.escapeId(ident.identifier);
  },
  fn: (fn: Fn): string =>
    `${fn.fnName}(${fn.args.map(Sql.value).join(',')})${
      fn.alias ? ` AS ${fn.alias}` : ''
    }`,
  value: (v: Value): string => {
    if (v.kind === QueryNodeKind.Function) return Sql.fn(v);
    if (v.kind === QueryNodeKind.Field) return Sql.fieldInCondition(v);
    if (v.kind === QueryNodeKind.Identifier) return Sql.identifier(v);
    return Sql.literal(v);
  },
  between: (expr: BetweenExpression): string =>
    `${Sql.value(expr.left)} BETWEEN ${Sql.value(expr.begin)} AND ${Sql.value(
      expr.end,
    )}`,
  contains: (expr: ContainsExpression): string => {
    const operator = expr.isNot ? 'NOT LIKE' : 'LIKE';
    const val = (value: string, type: ContainType) => {
      if (type === 'contains') return '%' + value + '%';
      if (type === 'start') return '%' + value;
      return value + '%';
    };
    return `${Sql.value(expr.left)} ${operator} ${SqlString.escape(
      val(expr.right, expr.type),
    )}`;
  },
  in: (expr: InExpression): string => {
    if ('right' in expr)
      return `${Sql.value(expr.left)} ${expr.operator} (${expr.right
        .map(Sql.value)
        .join(', ')})`;
    return `${Sql.value(expr.left)} ${expr.operator} (${Sql.queryOrRaw(
      expr.query,
    )})`;
  },
  comparison: (expr: ComparisonExpression): string =>
    `${Sql.value(expr.left)}  ${expr.operator} ${Sql.value(expr.right)}`,
  compound: (expr: CompoundExpression): string =>
    `${Sql.booleanValue(expr.left)}  ${expr.operator} ${Sql.booleanValue(
      expr.right,
    )}`,
  isNull: (expr: IsNullExpression): string =>
    `${Sql.value(expr.expr)} ${expr.isNot ? 'IS NOT NULL' : 'IS NULL'}`,
  paren: (expr: ParenthesisExpression): string =>
    '(' + Sql.booleanValue(expr) + ')',
  table: (table: QueryTable): string => {
    if (!table.subquery) {
      if (table.alias === table.name) return SqlString.escapeId(table.name);
      return (
        SqlString.escapeId(table.name) +
        ' AS ' +
        SqlString.escapeId(table.alias)
      );
    }
    return `(${queryToSql(table.query)}) AS ${SqlString.escapeId(table.alias)}`;
  },
  join: (join: Join): string =>
    `${join.type ? join.type + ' ' : ''}JOIN ${Sql.table(join.table)} ON ` +
    Sql.booleanValue(join.conditions),
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
      case QueryNodeKind.Exists:
        return Sql.exists(expr);
    }
  },
  exists: (expr: ExistsExpression): string => {
    return `EXISTS (${Sql.queryOrRaw(expr.query)})`;
  },
  sort: (expr: Sort): string => {
    const field = () => {
      switch (expr.field.kind) {
        case QueryNodeKind.Field:
          return Sql.fieldInCondition(expr.field);
        case QueryNodeKind.Identifier:
          return Sql.identifier(expr.field);
        default:
          return Sql.fn(expr.field);
      }
    };
    if (expr.direction)
      return `${field()} ${expr.direction === 'DESC' ? 'DESC' : 'ASC'}`;
    return field();
  },
  sorts: (sorts: Sort[]): string => sorts.map(Sql.sort).join(', '),
  queryOrRaw: (expr: Query | RawExpression) => {
    if ('kind' in expr) {
      return expr.expr;
    }
    return queryToSql(expr);
  },
};
