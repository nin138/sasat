import { SasatError } from '../error';
import * as SqlString from 'sqlstring';

export interface SQLCondition<T> {
  select?: Array<keyof T>;
  from: string;
  where?: SQLWhereConditions<T>;
  order?: SQLOrder<T>[];
  limit?: number;
  offset?: number;
}

export type SQLOrder<T> = [keyof T] | [keyof T, 'ASC'] | [keyof T, 'DESC'];

export type SQLComparisonOperators =
  | '='
  | '>'
  | '<'
  | '>='
  | '<='
  | '<>'
  | 'LIKE'
  | SQLComparisonOperator;
export enum SQLComparisonOperator {
  '=' = '=',
  '>' = '>',
  '<' = '<',
  '>=' = '>=',
  '<=' = '<=',
  '<>' = '<>',
  'LIKE' = 'LIKE',
}

export type SQLWhereConditions<T> = Where<T> | WhereOr<T> | WhereAnd<T>;

export type WhereOr<T> = {
  OR: SQLWhereConditions<T>[];
};

export type WhereAnd<T> = {
  AND: SQLWhereConditions<T>[];
};

export type Where<T> = Partial<
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

export const whereToSQL = <T>(
  where: SQLWhereConditions<T>,
  type: 'AND' | 'OR' = 'AND',
): string => {
  return Object.entries(where)
    .map(([key, value]) => {
      if (key === 'OR')
        return `(${value
          .map((it: SQLWhereConditions<T>) => whereToSQL(it))
          .join(' OR ')})`;
      if (key === 'AND')
        return `(${value
          .map((it: SQLWhereConditions<T>) => whereToSQL(it))
          .join(' AND ')})`;
      if (!Array.isArray(value)) return `${key} = ${SqlString.escape(value)}`;
      key = SqlString.escapeId(key);
      if (value[0] === 'IS NULL') return `${key} IS NULL`;
      if (value[0] === 'IS NOT NULL') return `${key} IS NOT NULL`;
      if (value[0] === 'IN') {
        const [, ...columns] = value;
        return `${key} IN (${[columns.map(SqlString.escape).join(', ')]})`;
      }
      if (value[0] === 'BETWEEN')
        return `${key} BETWEEN ${SqlString.escape(
          value[1],
        )} AND ${SqlString.escape(value[2])}`;
      if (Object.keys(SQLComparisonOperator).includes(value[0]))
        return `${key} ${value[0]} ${SqlString.escape(value[1])}`;
      throw new SasatError('SQL PARSE ERROR');
    })
    .join(` ${type} `);
};

export const orderToSQL = <T>(order: SQLOrder<T>[]): string =>
  order
    .map(
      it => `${SqlString.escapeId(it[0])} ${it[1] === 'DESC' ? 'DESC' : 'ASK'}`,
    )
    .join(', ');

export const conditionToSql = <T>(condition: SQLCondition<T>): string => {
  const select = condition.select
    ? condition.select.map(it => SqlString.escapeId(it)).join(', ')
    : '*';
  const where = condition.where ? ' WHERE ' + whereToSQL(condition.where) : '';
  const order = condition.order
    ? ' ORDER BY ' + orderToSQL(condition.order)
    : '';
  const limit = condition.limit ? ' LIMIT ' + condition.limit : '';
  const offset = condition.offset ? ' OFFSET ' : '';
  return `SELECT ${select} FROM ${condition.from}${where}${order}${limit}${offset}`;
};
