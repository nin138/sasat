import pkg from "sqlstring";
import { getDialect } from "../../db/dialect.js";

const postgresEscape = (value: unknown): string => {
  if (value == null) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("SQL numbers must be finite");
    return String(value);
  }
  if (typeof value === "bigint") return String(value);
  if (value instanceof Date) value = value.toISOString();
  if (Buffer.isBuffer(value))
    return `decode('${value.toString("hex")}', 'hex')`;
  if (typeof value !== "string") {
    throw new Error("PostgreSQL SQL values must be scalar values");
  }
  if (value.includes("\0"))
    throw new Error("PostgreSQL text cannot contain NUL");
  // E literals are independent of the connection's standard_conforming_strings.
  return "E'" + value.replaceAll("\\", "\\\\").replaceAll("'", "''") + "'";
};

export const SqlString = {
  escape: (value: unknown): string =>
    getDialect() === "postgres"
      ? postgresEscape(value)
      : pkg.escape(value, true),
  escapeId: (name: string): string => {
    if (getDialect() !== "postgres") return pkg.escapeId(name);
    if (name.includes("\0"))
      throw new Error("SQL identifiers cannot contain NUL");
    return name
      .split(".")
      .map((part) => '"' + part.replaceAll('"', '""') + '"')
      .join(".");
  },
};
