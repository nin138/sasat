import { Join, Query, QueryTable } from '../query.js';
import { Sql } from './nodeToSql.js';

const getJoin = (from: QueryTable): Join[] => {
  return from.joins.flatMap(join => [join, ...getJoin(join.table)]);
};

export const queryToSql = (query: Query): string => {
  const select = query.select.map(Sql.select).join(', ');
  const join = getJoin(query.from).map(Sql.join).join(' ');
  const where = query.where ? 'WHERE ' + Sql.booleanValue(query.where) : '';
  const sort =
    query.sort && query.sort.length !== 0
      ? ' ORDER BY ' + Sql.sorts(query.sort)
      : '';
  const offset = query.offset ? 'OFFSET ' + query.offset : '';
  const limit = query.limit ? ' LIMIT ' + query.limit : '';
  return (
    `SELECT ${select} FROM ${Sql.table(query.from)}` +
    join +
    where +
    sort +
    offset +
    limit
  );
};
