import { getConfiguredDialect } from "../config/config.js";

export type DatabaseDialect = "mysql" | "postgres";

export function getDialect(): DatabaseDialect {
  const dialect = getConfiguredDialect();
  if (dialect !== "mysql" && dialect !== "postgres") {
    throw new Error("db.dialect must be mysql or postgres");
  }
  return dialect;
}
