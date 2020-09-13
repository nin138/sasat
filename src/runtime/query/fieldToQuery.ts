import { Fields } from '../resolveField';
import { Join, Query, SelectExpr } from './query';
import { QExpr } from './factory';
import { RelationInfo, RelationMap } from './createQueryResolveInfo';

const join = (fields: Fields, info: RelationInfo, map: RelationMap, selects: SelectExpr[]): Join => {
  const tableAlias = fields.tableAlias || info.table;
  selects.push(...fields.fields.map(it => QExpr.field(tableAlias, it)));
  const joins: Join[] = Object.entries(fields.relations || {})
    .filter(([, fields]) => fields)
    .map(([rel, fields]) => join(fields!, map[info.table][rel], map, selects));
  return QExpr.join(QExpr.table(info.table, joins, fields.tableAlias), info.on);
};

export const fieldToQuery = (tableName: string, fields: Fields, map: RelationMap): Query => {
  const tableAlias = fields.tableAlias || tableName;
  const select: SelectExpr[] = fields.fields.map(it => QExpr.field(tableAlias, it));
  const joins: Join[] = Object.entries(fields.relations || {})
    .filter(([, fields]) => fields)
    .map(([rel, fields]) => join(fields!, map[tableName][rel], map, select));
  const from = QExpr.table(tableName, joins, fields.tableAlias);
  return {
    select,
    from,
  };
};
