import { SqlValueType } from '../../../db/connectors/dbClient.js';
import { SqlString } from '../../sql/sqlString.js';
import { TableInfo } from '../query/createQueryResolveInfo.js';
import { Sql } from '../query/sql/nodeToSql.js';
import { BooleanValueExpression } from '../query/query.js';

type ValueSet = {
  field: string;
  value: SqlValueType;
};

export type Create = {
  table: string;
  values: ValueSet[];
  upsert?: string[];
};

export type Update = {
  table: string;
  values: ValueSet[];
  where: BooleanValueExpression;
};

export type Delete = {
  table: string;
  where: BooleanValueExpression;
};

const escape = SqlString.escape;
const escapeId = SqlString.escapeId;

const onDuplicateKeyUpdate = (columns: Create['upsert']): string => {
  if (!columns || columns.length === 0) return '';
  return (
    ' ON DUPLICATE KEY UPDATE ' +
    columns
      .map(escapeId)
      .map(it => `${it} = VALUES(${it})`)
      .join(',')
  );
};

export const createToSql = (dsl: Create, tableInfo: TableInfo): string => {
  const map = tableInfo[dsl.table].columnMap;
  return `INSERT INTO ${escapeId(dsl.table)}(${dsl.values.map(it =>
    escapeId(map[it.field]),
  )}) VALUES(${dsl.values.map(it => escape(it.value))})${onDuplicateKeyUpdate(
    dsl.upsert,
  )}`;
};

export const updateToSql = (dsl: Update, tableInfo: TableInfo): string => {
  const map = tableInfo[dsl.table].columnMap;

  return `UPDATE ${escapeId(dsl.table)} SET ${dsl.values
    .map(it => escapeId(map[it.field]) + ' = ' + escape(it.value))
    .join(', ')} WHERE ${Sql.booleanValue(dsl.where)}`;
};

export const deleteToSql = (dsl: Delete): string => {
  return `DELETE FROM ${escapeId(dsl.table)} WHERE ${Sql.booleanValue(
    dsl.where,
  )}`;
};
