// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { SQLClient, SqlValueType } from './dbClient';

export const formatQuery = (str: TemplateStringsArray, ...params: any[]): string => {
  let ret = str[0];
  for (let i = 0; i < params.length; i++) {
    if (typeof params[i] === 'function') ret += params[i]();
    else if (Array.isArray(params[i])) ret += params[i].map((it: SqlValueType) => SQLClient.escape(it)).join(', ');
    else ret += SQLClient.escape(params[i]);
    ret += str[i + 1];
  }
  return ret;
};
