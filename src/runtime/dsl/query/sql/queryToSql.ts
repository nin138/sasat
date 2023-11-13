import { Join, LockMode, Query, QueryTable } from '../query.js';
import { Sql } from './nodeToSql.js';

const getJoin = (from: QueryTable): Join[] => {
  return from.joins.flatMap(join => [join, ...getJoin(join.table)]);
};

const getLock = (lock?: LockMode): string => {
  if (!lock) return '';
  if (lock === 'FOR UPDATE') return ' FOR UPDATE';
  return ' FOR SHARE';
};

export const queryToSql = (query: Query): string => {
  const select = query.select.map(Sql.select).join(', ');
  const join = getJoin(query.from).map(Sql.join).join(' ');
  const where = query.where ? ' WHERE ' + Sql.booleanValue(query.where) : '';
  const groupBy = query.groupBy
    ? ' GROUP BY' + query.groupBy.cols.map(Sql.value).join(',')
    : '';
  const sort =
    query.sort && query.sort.length !== 0
      ? ' ORDER BY ' + Sql.sorts(query.sort)
      : '';
  const limit = query.limit ? ' LIMIT ' + query.limit : '';
  const offset = query.offset ? ' OFFSET ' + query.offset : '';
  if (offset && !limit) throw new Error('LIMIT is required to use OFFSET.');
  return (
    `SELECT ${select} FROM ${Sql.table(query.from)}` +
    join +
    where +
    groupBy +
    sort +
    limit +
    offset +
    getLock(query.lock)
  );
};
