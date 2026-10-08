import type { SqlGenerator } from "../../../../db/sqlGenerator.js";
import {
  type SqlParameter,
  type SqlStatement,
  snapshotStatement,
} from "../../../../db/sqlStatement.js";
import type { Query } from "../query.js";
import { createSqlNodes } from "./nodeToSql.js";
import { renderQuery } from "./queryToSql.js";

/** A bind context belongs to one statement, including all of its subqueries. */
export function compileQuery(
  query: Query,
  generator: SqlGenerator,
): SqlStatement {
  const values: SqlParameter[] = [];
  const parameter = (value: unknown): string => {
    values.push(value as SqlParameter);
    return generator.dialect === "postgres" ? "$" + values.length : "?";
  };
  const bind = (value: unknown): string => {
    const placeholder = parameter(value);
    if (generator.dialect === "mysql") {
      // mysql2 sends numbers as DOUBLE and bigint as strings. Restore SQL
      // literal types for comparisons and computed columns on the server.
      if (
        typeof value === "bigint" ||
        (typeof value === "number" &&
          Number.isInteger(value) &&
          !String(value).includes("e"))
      ) {
        const integer = BigInt(value);
        const type =
          integer >= -9223372036854775808n && integer <= 9223372036854775807n
            ? "SIGNED"
            : integer >= 0n && integer <= 18446744073709551615n
              ? "UNSIGNED"
              : `DECIMAL(${String(integer).replace("-", "").length},0)`;
        return `CAST(${placeholder} AS ${type})`;
      }
      if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        !String(value).includes("e")
      ) {
        const [integer, fraction = ""] = String(value)
          .replace("-", "")
          .split(".");
        return `CAST(${placeholder} AS DECIMAL(${integer.length + fraction.length},${fraction.length}))`;
      }
      return placeholder;
    }
    // Match SQL numeric/boolean literal types, including literal-only comparisons
    // and overloaded functions. Strings retain the surrounding SQL type context.
    let type: string | undefined;
    if (typeof value === "boolean") type = "boolean";
    if (typeof value === "number" || typeof value === "bigint") {
      if (typeof value === "number" && !Number.isInteger(value))
        type = "numeric";
      else if (value >= -2147483648 && value <= 2147483647) type = "integer";
      else if (value >= -9223372036854775808n && value <= 9223372036854775807n)
        type = "bigint";
      else type = "numeric";
    }
    return placeholder + (type ? "::" + type : "");
  };
  const render = (query: Query): string =>
    renderQuery(query, generator, nodes, (value) => parameter(String(value)));
  const functionValue = (value: unknown, name: string): string => {
    const placeholder = bind(value);
    // These common functions accept any type and provide no inference context.
    if (
      generator.dialect === "postgres" &&
      (typeof value === "string" || value === null) &&
      ["COUNT", "CONCAT", "CONCAT_WS"].includes(name.toUpperCase())
    )
      return placeholder + "::text";
    return placeholder;
  };
  const nodes = createSqlNodes(generator, {
    value: bind,
    query: render,
    functionValue,
    frameValue: parameter,
  });
  return snapshotStatement({ text: render(query), values });
}
