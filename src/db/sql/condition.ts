import * as SqlString from 'sqlstring';
import {
  conditionExpressionToSql,
  WhereClause,
} from './expression/conditionExpression.js';
import { ComparisonOperators } from './expression/comparison.js';

export interface SQL<T, Join = unknown> {
  select: Array<keyof T | [keyof T, string]>;
  from: string | [string, string];
  join?: SQLJoin<T, Join, this['from']>[];
  where?: WhereClause<T>;
  order?: SQLOrder<T>[];
  limit?: number;
  offset?: number;
}

export type OnExpression<Column> = [Column, ComparisonOperators, Column];
export type OnClause<Column> = OnExpression<Column>[];

export interface SQLJoin<From, To, FromTable> {
  select: Array<keyof To | [keyof To, string]>;
  table: string | [string, string];
  on: OnClause<
    | [this['table'] extends [] ? this['table'][1] : this['table'], keyof To]
    | [FromTable, keyof From]
  >;
  where?: WhereClause<To>;
}

const formatTable = (table: string | [string, string]) => {
  return typeof table === 'string'
    ? SqlString.escapeId(table)
    : table.map(it => SqlString.escapeId(it)).join('as');
};

const joinClause = <T, U>(sql: SQL<T, U>): string => {
  if (!sql.join) return '';
  return sql.join
    .map(it => {
      const on = it.on
        .map(it => {
          const left =
            SqlString.escapeId(it[0][0]) + '.' + SqlString.escapeId(it[0][1]);
          const operator = it[1];
          const right =
            SqlString.escapeId(it[2][0]) + '.' + SqlString.escapeId(it[2][1]);
          return left + operator + right;
        })
        .join('&');
      const table = formatTable(it.table);
      return ` join ${table} on ${on}`;
    })
    .join(' ');
};

export type SQLOrder<T> = [keyof T] | [keyof T, 'ASC'] | [keyof T, 'DESC'];

export const orderToSQL = <T>(order: SQLOrder<T>[]): string =>
  order
    .map(
      it => `${SqlString.escapeId(it[0])} ${it[1] === 'DESC' ? 'DESC' : 'ASK'}`,
    )
    .join(', ');

const mergeWhereClause = (
  whereClauses: WhereClause<unknown>[],
): WhereClause<unknown> => {
  const result: WhereClause<unknown>[] = [];
  for (const it of whereClauses) {
    if (Array.isArray(it)) result.push(...it);
    else result.push(it);
  }
  return result;
};

export const createSQLString = <T>(sql: SQL<T>): string => {
  const select = [
    ...sql.select,
    ...(sql.join ? sql.join.flatMap(it => it.select) : []),
  ]
    .map(it =>
      Array.isArray(it)
        ? it.map(it => SqlString.escapeId(it)).join(' as ')
        : SqlString.escapeId(it),
    )
    .join(', ');
  const join = joinClause(sql);
  const whereClauses: Array<WhereClause<unknown>> = [
    sql.where,
    ...(sql.join ? sql.join.map(it => it.where) : []),
  ].filter(
    it => it !== undefined && Object.keys(it).length,
  ) as WhereClause<unknown>[];
  const where =
    whereClauses.length === 0
      ? ''
      : ' WHERE ' + conditionExpressionToSql(mergeWhereClause(whereClauses));
  const order = sql.order ? ' ORDER BY ' + orderToSQL(sql.order) : '';
  const limit = sql.limit ? ' LIMIT ' + sql.limit : '';
  const offset = sql.offset ? ' OFFSET ' : '';
  const from = formatTable(sql.from);
  return `SELECT ${select} FROM ${from} ${join}${where}${order}${limit}${offset}`;
};
