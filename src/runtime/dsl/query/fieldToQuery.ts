import { Join, Query, SelectExpr } from './query';
import { RelationInfo, RelationMap } from './createQueryResolveInfo';
import { SELECT_ALIAS_SEPARATOR } from './sql/nodeToSql';
import { Fields } from 'sasat';
import { QExpr } from '../factory';

const join = (
  parentTableAlias: string,
  fields: Fields,
  info: RelationInfo,
  map: RelationMap,
  selects: SelectExpr[],
): Join => {
  const tableAlias = fields.tableAlias || info.table;
  selects.push(...fields.fields.map(it => QExpr.field(tableAlias, it, tableAlias + SELECT_ALIAS_SEPARATOR + it)));
  const joins: Join[] = Object.entries(fields.relations || {})
    .filter(([, fields]) => fields)
    .map(([rel, fields]) => join(tableAlias, fields!, map[info.table][rel], map, selects));
  return QExpr.join(QExpr.table(info.table, joins, fields.tableAlias), info.on(parentTableAlias, tableAlias), 'LEFT');
};

export const fieldToQuery = (tableName: string, fields: Fields, map: RelationMap): Query => {
  const tableAlias = fields.tableAlias || tableName;
  const select: SelectExpr[] = fields.fields.map(it =>
    QExpr.field(tableAlias, it, tableAlias + SELECT_ALIAS_SEPARATOR + it),
  );
  const joins: Join[] = Object.entries(fields.relations || {})
    .filter(([, fields]) => fields)
    .map(([rel, fields]) => join(tableAlias, fields!, map[tableName][rel], map, select));
  const from = QExpr.table(tableName, joins, fields.tableAlias);
  return {
    select,
    from,
  };
};
