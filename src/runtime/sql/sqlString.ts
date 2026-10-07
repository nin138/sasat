import pkg from "sqlstring";
import { type DatabaseDialect, getDialect } from "../../db/dialect.js";

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

function strings(dialect: DatabaseDialect) {
  return {
    escape: (value: unknown): string =>
      typeof value === "bigint"
        ? String(value)
        : dialect === "postgres"
          ? postgresEscape(value)
          : pkg.escape(value, true),
    escapeId: (name: string): string => {
      if (dialect !== "postgres") return pkg.escapeId(name);
      if (name.includes("\0"))
        throw new Error("SQL identifiers cannot contain NUL");
      return name
        .split(".")
        .map((part) => '"' + part.replaceAll('"', '""') + '"')
        .join(".");
    },
  };
}
const mysql = Object.freeze(strings("mysql"));
const postgres = Object.freeze(strings("postgres"));
export const getSqlString = (dialect: DatabaseDialect) =>
  dialect === "postgres" ? postgres : mysql;

/** Convenience helpers using the current configuration at the call boundary. */
export const SqlString = {
  escape: (value: unknown): string => getSqlString(getDialect()).escape(value),
  escapeId: (name: string): string => getSqlString(getDialect()).escapeId(name),
};
