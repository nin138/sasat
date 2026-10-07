import type { ConnectionOptions } from "mysql2/promise";
import type { CommandResponse, QueryResponse } from "../dbClient.js";
import { normalizeInsertId } from "../numeric.js";

export const mysqlNumericOptions: ConnectionOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
  typeCast(field, next) {
    if (field.type === "LONGLONG") {
      const value = field.string();
      return value === null ? null : BigInt(value);
    }
    if (field.type === "NEWDECIMAL" || field.type === "DECIMAL")
      return field.string();
    return next();
  },
};

export function normalizeMysqlResult(
  result: unknown,
): QueryResponse | CommandResponse {
  if (Array.isArray(result)) return result as QueryResponse;
  const command = result as CommandResponse;
  return { ...command, insertId: normalizeInsertId(command.insertId) };
}
