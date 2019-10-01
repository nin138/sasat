import { SQLClient } from './db/dbClient';

export interface Condition<T> {
  select?: Array<keyof T>;
  where?: SQLWhereConditions<T>;
  order?: SQLOrder<T>[];
  limit?: number;
  offset?: number;
}

export type SQLOrder<T> = [keyof T] | [keyof T, 'ASC'] | [keyof T, 'DESC'];

export type SQLComparisonOperators = '=' | '>' | '<' | '>=' | '<=' | '<>' | 'LIKE';

export type SQLWhereConditions<T> = Where<T> | WhereOr<T>;

type WhereOr<T> = {
  OR: SQLWhereConditions<T>[];
};

type Where<T> = Partial<
  {
    [P in keyof T]:
      | T[P]
      | [SQLComparisonOperators, T[P]]
      | ['BETWEEN', T[P], T[P]]
      | ['IN', ...T[P][]]
      | ['IS NULL']
      | ['IS NOT NULL'];
  }
>;

export const whereToSQL = <T>(where: SQLWhereConditions<T>, type: 'AND' | 'OR' = 'AND'): string => {
  return Object.entries(where)
    .map(([key, value]) => {
      if (key === 'OR') {
        return `(${value.map((it: SQLWhereConditions<T>) => whereToSQL(it)).join(' OR ')})`;
      }
      if (!Array.isArray(value)) return `${key} = ${SQLClient.escape(value)}`;
      if (value[0] === 'IS NULL') return `${key} IS NULL`;
      if (value[0] === 'IS NOT NULL') return `${key} IS NOT NULL`;
      if (value[0] === 'IN') {
        const [_, ...columns] = value;
        return `${key} IN (${[columns.map(SQLClient.escape).join(', ')]})`;
      }
      if (value[0] === 'BETWEEN') return `${key} BETWEEN ${value[1]} AND ${value[2]}`;
      return `${key} ${value[0]} ${value[1]}`;
    })
    .join(` ${type} `);
};

export const orderToSQL = <T>(order: SQLOrder<T>[]): string =>
  order.map(it => `${it[0]} ${it[1] === 'DESC' ? 'DESC' : 'ASK'}`).join(', ');
