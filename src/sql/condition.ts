import * as SqlString from 'sqlstring';
import { conditionExpressionToSql, WhereClause } from './expression/conditionExpression';
import { ComparisonOperators } from './expression/comparison';

export interface SQL<T, Join = unknown> {
  select: Array<keyof T>;
  from: string;
  join?: SQLJoin<T, Join, this['from']>[];
  where?: WhereClause<T>;
  order?: SQLOrder<T>[];
  limit?: number;
  offset?: number;
}

type OnClause<Column> = Array<[Column, ComparisonOperators, Column]>;

export interface SQLJoin<From, To, FromTable> {
  select: Array<keyof To>;
  table: string | [string, string];
  on: OnClause<[this['table'] extends [] ? this['table'][1] : this['table'], keyof To] | [FromTable, keyof From]>;
  where?: WhereClause<To>;
}

const joinClause = <T, U>(sql: SQL<T, U>): string => {
  if (!sql.join) return '';
  return sql.join
    .map(it => {
      const on = it.on
        .map(it => {
          const left = SqlString.escapeId(it[0][0]) + '.' + SqlString.escapeId(it[0][1]);
          const operator = it[1];
          const right = SqlString.escapeId(it[2][0]) + '.' + SqlString.escapeId(it[2][1]);
          return left + operator + right;
        })
        .join('&');
      const table =
        typeof it.table === 'string'
          ? SqlString.escapeId(it.table)
          : it.table.map(it => SqlString.escapeId(it)).join('as');
      return ` join ${table} on ${on}`;
    })
    .join(' ');
};

export type SQLOrder<T> = [keyof T] | [keyof T, 'ASC'] | [keyof T, 'DESC'];

export const orderToSQL = <T>(order: SQLOrder<T>[]): string =>
  order.map(it => `${SqlString.escapeId(it[0])} ${it[1] === 'DESC' ? 'DESC' : 'ASK'}`).join(', ');

export const createSQLString = <T>(sql: SQL<T>): string => {
  const select = [...sql.select, ...(sql.join ? sql.join.flatMap(it => it.select) : [])]
    .map(it => SqlString.escapeId(it))
    .join(', ');
  const join = joinClause(sql);
  const where =
    sql.where && (!Array.isArray(sql.where) || sql.where.length !== 0)
      ? ' WHERE ' + conditionExpressionToSql([sql.where, ...(sql.join ? sql.join.map(it => it.where) : [])])
      : '';
  const order = sql.order ? ' ORDER BY ' + orderToSQL(sql.order) : '';
  const limit = sql.limit ? ' LIMIT ' + sql.limit : '';
  const offset = sql.offset ? ' OFFSET ' : '';
  return `SELECT ${select}${join} FROM ${sql.from}${where}${order}${limit}${offset}`;
};
