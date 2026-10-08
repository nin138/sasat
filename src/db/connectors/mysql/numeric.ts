import type { ConnectionOptions } from "mysql2/promise";
import type { CommandResponse, QueryResponse } from "../dbClient.js";
import { normalizeInsertId } from "../numeric.js";

export const mysqlNumericOptions: ConnectionOptions = {
  supportBigNumbers: true,
  bigNumberStrings: true,
  typeCast(field, next) {
    if (field.type === "LONGLONG") {
      // next() decodes both text and binary LONGLONG packets correctly.
      // field.string() assumes a length-prefixed string in binary results.
      const value = next();
      if (value === null) return null;
      if (
        typeof value === "string" ||
        typeof value === "bigint" ||
        (typeof value === "number" && Number.isSafeInteger(value))
      )
        return BigInt(value);
      throw new Error("MySQL BIGINT was not decoded as an exact integer");
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
