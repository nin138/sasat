import type { SqlValueType } from "./connectors/dbClient.js";

/** Scalar bind values. Identifiers, expressions, lists and DEFAULT belong in SQL. */
export type SqlParameter = SqlValueType | Date | Buffer;

export interface SqlStatement {
  readonly text: string;
  readonly values: readonly SqlParameter[];
}

/** Validate before opening a connection and snapshot values before any await. */
export function snapshotStatement(statement: SqlStatement): SqlStatement {
  if (
    !statement ||
    typeof statement.text !== "string" ||
    !Array.isArray(statement.values)
  )
    throw new TypeError("SQL statement requires text and a values array");
  const values = Array.from(statement.values, (value, index): SqlParameter => {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    )
      return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value instanceof Date && Number.isFinite(value.getTime()))
      return new Date(value.getTime());
    if (Buffer.isBuffer(value)) return Buffer.from(value);
    throw new TypeError(`Invalid SQL parameter at index ${index}`);
  });
  return { text: statement.text, values };
}
