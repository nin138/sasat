import { SqlValueType } from './dbClient';
import * as SqlString from 'sqlstring';

export const formatQuery = (
  str: TemplateStringsArray,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...params: any[]
): string => {
  let ret = str[0];
  for (let i = 0; i < params.length; i++) {
    if (typeof params[i] === 'function') ret += params[i]();
    else if (Array.isArray(params[i]))
      ret += params[i]
        .map((it: SqlValueType) => SqlString.escape(it))
        .join(', ');
    else ret += SqlString.escape(params[i]);
    ret += str[i + 1];
  }
  return ret;
};
