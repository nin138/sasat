import { Join, NO_ALIAS, Query, SelectExpr } from './query.js';
import { RelationInfo, RelationMap } from './createQueryResolveInfo.js';
import { SELECT_ALIAS_SEPARATOR } from './sql/nodeToSql.js';
import { QExpr } from '../factory.js';
import { Fields } from '../../field.js';

const join = (
  parentTableAlias: string,
  fields: Fields,
  info: RelationInfo,
  map: RelationMap,
  selects: SelectExpr[],
): Join => {
  const tableAlias = fields.tableAlias || info.table;
  selects.push(
    ...(fields.fields as string[]).map(it =>
      QExpr.field(tableAlias, it, tableAlias + SELECT_ALIAS_SEPARATOR + it),
    ),
  );
  const joins: Join[] = Object.entries(fields.relations || {})
    .filter(([, fields]) => fields)
    .map(([rel, fields]) =>
      join(tableAlias, fields!, map[info.table][rel], map, selects),
    );
  return QExpr.join(
    QExpr.table(info.table, joins, fields.tableAlias || info.table),
    info.on(parentTableAlias, tableAlias),
    'LEFT',
  );
};

export const fieldToQuery = (
  tableName: string,
  fields: Fields,
  map: RelationMap,
): Pick<Query, 'select' | 'from'> => {
  const tableAlias = fields.tableAlias || tableName;
  const select: SelectExpr[] = (fields.fields as string[]).map(it =>
    QExpr.field(tableAlias, it, tableAlias + SELECT_ALIAS_SEPARATOR + it),
  );
  const joins: Join[] = Object.entries(fields.relations || {})
    .filter(([, fields]) => fields)
    .map(([rel, fields]) =>
      join(tableAlias, fields!, map[tableName][rel], map, select),
    );
  const from = QExpr.table(tableName, joins, fields.tableAlias || tableName);
  return {
    select,
    from,
  };
};

export const createPagingInnerQuery = (
  tableName: string,
  fields: Fields,
  len: number,
  offset: number,
): Query => {
  return {
    select: (fields.fields as string[]).map(it => QExpr.field(tableName, it, NO_ALIAS)),
    from: QExpr.table(tableName, [], tableName),
    limit: len,
    offset,
  };
};
