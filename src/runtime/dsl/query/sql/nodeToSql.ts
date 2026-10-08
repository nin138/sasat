import {
  createSqlGenerator,
  type SqlGenerator,
} from "../../../../db/sqlGenerator.js";
import {
  type BetweenExpression,
  type BooleanValueExpression,
  type CastExpression,
  type ComparisonExpression,
  type CompoundExpression,
  type ContainsExpression,
  type ContainType,
  type ExistsExpression,
  type Field,
  type Fn,
  type Identifier,
  type InExpression,
  type IsNullExpression,
  type Join,
  type Literal,
  type Over,
  type ParenthesisExpression,
  type Query,
  QueryNodeKind,
  type QueryTable,
  type RawExpression,
  type SelectExpr,
  type Sort,
  type Value,
  type Window,
  type WindowContent,
} from "../query.js";
import { queryToSql } from "./queryToSql.js";

export const SELECT_ALIAS_SEPARATOR = "__";

export function createSqlNodes(
  generator: SqlGenerator,
  options?: {
    value: (value: unknown) => string;
    query: (query: Query) => string;
    functionValue?: (value: unknown, functionName: string) => string;
    frameValue?: (value: number) => string;
  },
) {
  const SqlString = generator;
  const renderValue = options?.value ?? SqlString.escape;
  const renderQuery =
    options?.query ?? ((query: Query) => queryToSql(query, generator));
  function partitionBy(ids?: Identifier[]) {
    if (!ids || ids.length === 0) return "";
    return `PARTITION BY ${ids.map(Sql.identifier).join(",")} `;
  }
  function orderBy(sorts?: Sort[]) {
    if (!sorts || sorts.length === 0) return "";
    return `ORDER BY ${sorts.map(Sql.sort).join(",")} `;
  }

  function windowValue(value: WindowContent) {
    if (value.type === "FOLLOWING" || value.type === "PRECEDING") {
      const frame = options?.frameValue ?? renderValue;
      return `${frame(value.value)} ${value.type}`;
    }
    return value.type;
  }
  function window(window?: Window) {
    if (!window) return "";
    if (window.between) {
      return `${window.type} BETWEEN ${windowValue(window.start)} AND ${windowValue(window.end)}`;
    }
    return `${window.type} ${windowValue(window.value)}`;
  }

  function over(v?: Over) {
    if (!v) return "";
    return `OVER (${partitionBy(v.partitionBy)}${orderBy(v.orderBy)}${window(v.window)})`;
  }

  const Sql = {
    select: (expr: SelectExpr): string => {
      switch (expr.kind) {
        case QueryNodeKind.Raw:
          return expr.expr;
        case QueryNodeKind.Field:
          return Sql.fieldInSelect(expr);
        case QueryNodeKind.Identifier:
          return Sql.identifier(expr);
        case QueryNodeKind.Function:
          return Sql.fn(expr);
        case QueryNodeKind.Cast:
          return Sql.cast(expr);
      }
    },
    literal: (literal: Literal): string => renderValue(literal.value),
    fieldInCondition: (identifier: Field): string =>
      SqlString.escapeId(identifier.table) +
      "." +
      SqlString.escapeId(identifier.name),
    fieldInSelect: (identifier: Field): string => {
      const alias =
        identifier.alias && identifier.name !== identifier.alias
          ? " AS " + SqlString.escapeId(identifier.alias)
          : "";
      return (
        SqlString.escapeId(identifier.table) +
        "." +
        SqlString.escapeId(identifier.name) +
        alias
      );
    },
    identifier: (ident: Identifier): string => {
      return SqlString.escapeId(ident.identifier);
    },
    cast: (expr: CastExpression): string =>
      `CAST(${Sql.value(expr.value)} AS ${expr.sqlType})`,
    fn: (fn: Fn): string => {
      const args = fn.args
        .map((arg) =>
          arg.kind === QueryNodeKind.Literal && options?.functionValue
            ? options.functionValue(arg.value, fn.fnName)
            : Sql.value(arg),
        )
        .join(",");
      return `${fn.fnName}(${args})${over(fn.over)}${
        fn.alias
          ? ` AS ${generator.dialect === "postgres" ? SqlString.escapeId(fn.alias) : fn.alias}`
          : ""
      }`;
    },
    value: (v: Value): string => {
      if (v.kind === QueryNodeKind.Function) return Sql.fn(v);
      if (v.kind === QueryNodeKind.Field) return Sql.fieldInCondition(v);
      if (v.kind === QueryNodeKind.Identifier) return Sql.identifier(v);
      if (v.kind === QueryNodeKind.Cast) return Sql.cast(v);
      return Sql.literal(v);
    },
    between: (expr: BetweenExpression): string =>
      `${Sql.value(expr.left)} BETWEEN ${Sql.value(expr.begin)} AND ${Sql.value(
        expr.end,
      )}`,
    contains: (expr: ContainsExpression): string => {
      const operator = expr.isNot ? "NOT LIKE" : "LIKE";
      const val = (value: string, type: ContainType) => {
        if (type === "contains") return "%" + value + "%";
        if (type === "start") return value + "%";
        return "%" + value;
      };
      return `${Sql.value(expr.left)} ${operator} ${renderValue(
        val(expr.right, expr.type),
      )}`;
    },
    in: (expr: InExpression): string => {
      if ("right" in expr && expr.right.length === 0)
        return expr.operator === "IN" ? "0 = 1" : "1 = 1";
      if ("right" in expr)
        return `${Sql.value(expr.left)} ${expr.operator} (${expr.right
          .map(Sql.value)
          .join(", ")})`;
      return `${Sql.value(expr.left)} ${expr.operator} (${Sql.queryOrRaw(
        expr.query,
      )})`;
    },
    comparison: (expr: ComparisonExpression): string =>
      `${Sql.value(expr.left)}  ${expr.operator} ${Sql.value(expr.right)}`,
    compound: (expr: CompoundExpression): string => {
      const operand = (child: BooleanValueExpression): string => {
        const sql = Sql.booleanValue(child);
        // Preserve the AST grouping when AND and OR are nested.
        return child.kind === QueryNodeKind.CompoundExpr &&
          child.operator !== expr.operator
          ? "(" + sql + ")"
          : sql;
      };
      return (
        operand(expr.left) + " " + expr.operator + " " + operand(expr.right)
      );
    },
    isNull: (expr: IsNullExpression): string =>
      `${Sql.value(expr.expr)} ${expr.isNot ? "IS NOT NULL" : "IS NULL"}`,
    paren: (expr: ParenthesisExpression): string =>
      "(" + Sql.booleanValue(expr.expression) + ")",
    table: (table: QueryTable): string => {
      if (!table.subquery) {
        if (table.alias === table.name) return SqlString.escapeId(table.name);
        return (
          SqlString.escapeId(table.name) +
          " AS " +
          SqlString.escapeId(table.alias)
        );
      }
      return `(${renderQuery(table.query)}) AS ${SqlString.escapeId(table.alias)}`;
    },
    join: (join: Join): string =>
      `${join.type ? join.type + " " : ""}JOIN ${Sql.table(join.table)} ON ` +
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
        case QueryNodeKind.Raw:
          return expr.expr;
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
        return `${field()} ${expr.direction === "DESC" ? "DESC" : "ASC"}`;
      return field();
    },
    sorts: (sorts: Sort[]): string => sorts.map(Sql.sort).join(", "),
    queryOrRaw: (expr: Query | RawExpression): string => {
      if ("kind" in expr) {
        return expr.expr;
      }
      return renderQuery(expr);
    },
  };

  return Object.freeze(Sql);
}

/** Backward-compatible config-based entry points. */
export const Sql: ReturnType<typeof createSqlNodes> = {
  cast: (value) => createSqlGenerator().nodes.cast(value),
  select: (value) => createSqlGenerator().nodes.select(value),
  literal: (value) => createSqlGenerator().nodes.literal(value),
  fieldInCondition: (value) =>
    createSqlGenerator().nodes.fieldInCondition(value),
  fieldInSelect: (value) => createSqlGenerator().nodes.fieldInSelect(value),
  identifier: (value) => createSqlGenerator().nodes.identifier(value),
  fn: (value) => createSqlGenerator().nodes.fn(value),
  value: (value) => createSqlGenerator().nodes.value(value),
  between: (value) => createSqlGenerator().nodes.between(value),
  contains: (value) => createSqlGenerator().nodes.contains(value),
  in: (value) => createSqlGenerator().nodes.in(value),
  comparison: (value) => createSqlGenerator().nodes.comparison(value),
  compound: (value) => createSqlGenerator().nodes.compound(value),
  isNull: (value) => createSqlGenerator().nodes.isNull(value),
  paren: (value) => createSqlGenerator().nodes.paren(value),
  table: (value) => createSqlGenerator().nodes.table(value),
  join: (value) => createSqlGenerator().nodes.join(value),
  booleanValue: (value) => createSqlGenerator().nodes.booleanValue(value),
  exists: (value) => createSqlGenerator().nodes.exists(value),
  sort: (value) => createSqlGenerator().nodes.sort(value),
  sorts: (value) => createSqlGenerator().nodes.sorts(value),
  queryOrRaw: (value) => createSqlGenerator().nodes.queryOrRaw(value),
};
