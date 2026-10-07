import type { SqlValueType } from "./connectors/dbClient.js";
import { createSqlGenerator, type SqlGenerator } from "./sqlGenerator.js";

export const formatQueryWith = (
  SqlString: SqlGenerator,
  str: TemplateStringsArray,
  // biome-ignore lint/suspicious/noExplicitAny: <>
  ...params: any[]
): string => {
  let ret = str[0];
  for (let i = 0; i < params.length; i++) {
    if (typeof params[i] === "function") ret += params[i]();
    else if (Array.isArray(params[i]))
      ret += params[i]
        .map((it: SqlValueType) => SqlString.escape(it))
        .join(", ");
    else ret += SqlString.escape(params[i]);
    ret += str[i + 1];
  }
  return ret;
};

export const formatQuery = (
  str: TemplateStringsArray,
  ...params: unknown[]
): string => formatQueryWith(createSqlGenerator(), str, ...params);
