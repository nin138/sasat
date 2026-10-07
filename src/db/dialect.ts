import { AsyncLocalStorage } from "node:async_hooks";
import { config } from "../config/config.js";

export type DatabaseDialect = "mysql" | "postgres";
const scope = new AsyncLocalStorage<DatabaseDialect>();

export function getDialect(): DatabaseDialect {
  const dialect = scope.getStore() ?? config().db.dialect ?? "mysql";
  if (dialect !== "mysql" && dialect !== "postgres") {
    throw new Error("db.dialect must be mysql or postgres");
  }
  return dialect;
}

/** Scope SQL generation to its executor, including nested SQL expressions. */
export function withDialect<T>(dialect: DatabaseDialect, action: () => T): T {
  return scope.run(dialect, action);
}
