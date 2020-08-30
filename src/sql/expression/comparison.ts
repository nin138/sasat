import * as SqlString from 'sqlstring';
import { SasatError } from '../../error';

export enum Comparison {
  eq = '=',
  gt = '>',
  lt = '<',
  gte = '>=',
  lte = '<=',
  neq = '<>',
  like = 'LIKE',
  notLike = 'NOT LIKE',
}

type ComparisonOperators = '=' | '>' | '<' | '>=' | '<=' | '<>' | 'LIKE' | 'NOT LIKE';

type AndOr = 'AND' | 'OR';

export type ComparisonExpression<T> = Partial<
  {
    [P in keyof T]:
      | T[P]
      | [ComparisonOperators, T[P]]
      | ['BETWEEN', T[P], T[P]]
      | ['IN', ...T[P][]]
      | ['IS NULL']
      | ['IS NOT NULL'];
  }
> & {
  __type?: AndOr;
};

export const comparisonExpressionToSql = (exp: ComparisonExpression<unknown>): string => {
  const type = Object.prototype.hasOwnProperty.call(exp, '__type') ? exp.__type || 'AND' : 'AND';
  return Object.entries(exp)
    .map(([key, value]) => {
      const column = SqlString.escapeId(key);
      if (!Array.isArray(value)) return `${column} = ${SqlString.escape(value)}`;
      if (value[0] === 'IS NULL') return `${column} IS NULL`;
      if (value[0] === 'IS NOT NULL') return `${column} IS NOT NULL`;
      if (value[0] === 'IN') {
        const [, ...columns] = value;
        return `${column} IN (${[columns.map(SqlString.escape).join(', ')]})`;
      }
      if (value[0] === 'BETWEEN')
        return `${column} BETWEEN ${SqlString.escape(value[1])} AND ${SqlString.escape(value[2])}`;
      if (Object.keys(Comparison).includes(value[0])) return `${column} ${value[0]} ${SqlString.escape(value[1])}`;
      throw new SasatError('SQL PARSE ERROR');
    })
    .join(` ${type} `);
};
