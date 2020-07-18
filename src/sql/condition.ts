import * as SqlString from 'sqlstring';
import {
  conditionExpressionToSql,
  WhereClause,
} from './expression/conditionExpression';

export interface SQLCondition<T> {
  select?: Array<keyof T>;
  from: string;
  where?: WhereClause<T>;
  order?: SQLOrder<T>[];
  limit?: number;
  offset?: number;
}

export type SQLOrder<T> = [keyof T] | [keyof T, 'ASC'] | [keyof T, 'DESC'];

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
  const where =
    condition.where &&
    (!Array.isArray(condition.where) || condition.where.length !== 0)
      ? ' WHERE ' + conditionExpressionToSql(condition.where)
      : '';
  const order = condition.order
    ? ' ORDER BY ' + orderToSQL(condition.order)
    : '';
  const limit = condition.limit ? ' LIMIT ' + condition.limit : '';
  const offset = condition.offset ? ' OFFSET ' : '';
  return `SELECT ${select} FROM ${condition.from}${where}${order}${limit}${offset}`;
};
