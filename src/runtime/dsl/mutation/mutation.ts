import type { SqlValueType } from "@/db/connectors/dbClient.js";
import { SqlString } from "../../sql/sqlString.js";
import type { TableInfo } from "../query/createQueryResolveInfo.js";
import type { BooleanValueExpression } from "../query/query.js";
import { Sql } from "../query/sql/nodeToSql.js";

type ValueSet = {
  field: string;
  value: SqlValueType;
};

export type Create = {
  table: string;
  fields: string[];
  entities: SqlValueType[][];
  upsert?: string[];
  ignore?: boolean;
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

const escapeId = SqlString.escapeId;

const onDuplicateKeyUpdate = (columns: Create["upsert"]): string => {
  if (!columns || columns.length === 0) return "";
  return (
    " ON DUPLICATE KEY UPDATE " +
    columns
      .map(escapeId)
      .map((it) => `${it} = VALUES(${it})`)
      .join(",")
  );
};

export const createToSql = (dsl: Create, tableInfo: TableInfo): string => {
  const map = tableInfo[dsl.table].columnMap;
  const values = dsl.entities
    .map((it) => `(${it.map((it) => SqlString.escape(it)).join(",")})`)
    .join(",");
  return `INSERT ${dsl.ignore ? "IGNORE " : ""}INTO ${escapeId(
    dsl.table,
  )}(${dsl.fields.map((it) => escapeId(map[it]))}) VALUES ${values} ${onDuplicateKeyUpdate(dsl.upsert)}`;
};

export const updateToSql = (dsl: Update, tableInfo: TableInfo): string => {
  const map = tableInfo[dsl.table].columnMap;

  return `UPDATE ${escapeId(dsl.table)} SET ${dsl.values
    .map((it) => escapeId(map[it.field]) + " = " + SqlString.escape(it.value))
    .join(", ")} WHERE ${Sql.booleanValue(dsl.where)}`;
};

export const deleteToSql = (dsl: Delete): string => {
  return `DELETE FROM ${escapeId(dsl.table)} WHERE ${Sql.booleanValue(
    dsl.where,
  )}`;
};
