import type { SqlValueType } from "@/db/connectors/dbClient.js";
import {
  createSqlGenerator,
  type SqlGenerator,
} from "../../../db/sqlGenerator.js";
import type { TableInfo } from "../query/createQueryResolveInfo.js";
import type { BooleanValueExpression } from "../query/query.js";

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
  returning?: string;
  conflictColumns?: string[];
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

const onDuplicateKeyUpdate = (
  columns: Create["upsert"],
  generator: SqlGenerator,
): string => {
  const escapeId = generator.escapeId;
  if (!columns || columns.length === 0) return "";
  return (
    " ON DUPLICATE KEY UPDATE " +
    columns
      .map(escapeId)
      .map((it) => `${it} = VALUES(${it})`)
      .join(",")
  );
};

export const createToSql = (
  dsl: Create,
  tableInfo: TableInfo,
  generator: SqlGenerator = createSqlGenerator(),
): string => {
  const SqlString = generator;
  const escapeId = generator.escapeId;
  const map = tableInfo[dsl.table].columnMap;
  if (generator.dialect === "postgres") {
    const columns = dsl.fields.map((it) => escapeId(map[it])).join(",");
    if (dsl.fields.length === 0 && dsl.entities.length !== 1)
      throw new Error(
        "PostgreSQL bulk default inserts require at least one column",
      );
    const values = dsl.fields.length
      ? `(${columns}) VALUES ${dsl.entities.map((row) => `(${row.map((value) => SqlString.escape(value)).join(",")})`).join(",")}`
      : "DEFAULT VALUES";
    let conflict = dsl.ignore ? " ON CONFLICT DO NOTHING" : "";
    if (dsl.upsert?.length) {
      const keys = dsl.conflictColumns ?? tableInfo[dsl.table].identifiableKeys;
      if (!keys.length)
        throw new Error("PostgreSQL upsert requires conflict columns");
      conflict = ` ON CONFLICT (${keys.map(escapeId).join(",")}) DO UPDATE SET ${dsl.upsert.map((col) => `${escapeId(col)} = EXCLUDED.${escapeId(col)}`).join(",")}`;
    }
    const returning = dsl.returning
      ? ` RETURNING ${escapeId(dsl.returning)} AS "__sasat_insert_id"`
      : "";
    return `INSERT INTO ${escapeId(dsl.table)} ${values}${conflict}${returning}`;
  }
  const values = dsl.entities
    .map((it) => `(${it.map((it) => SqlString.escape(it)).join(",")})`)
    .join(",");
  return `INSERT ${dsl.ignore ? "IGNORE " : ""}INTO ${escapeId(
    dsl.table,
  )}(${dsl.fields.map((it) => escapeId(map[it]))}) VALUES ${values} ${onDuplicateKeyUpdate(dsl.upsert, generator)}`;
};

export const updateToSql = (
  dsl: Update,
  tableInfo: TableInfo,
  generator: SqlGenerator = createSqlGenerator(),
): string => {
  const SqlString = generator;
  const escapeId = generator.escapeId;
  const Sql = generator.nodes;
  const map = tableInfo[dsl.table].columnMap;

  return `UPDATE ${escapeId(dsl.table)} SET ${dsl.values
    .map((it) => escapeId(map[it.field]) + " = " + SqlString.escape(it.value))
    .join(", ")} WHERE ${Sql.booleanValue(dsl.where)}`;
};

export const deleteToSql = (
  dsl: Delete,
  generator: SqlGenerator = createSqlGenerator(),
): string => {
  const escapeId = generator.escapeId;
  const Sql = generator.nodes;
  return `DELETE FROM ${escapeId(dsl.table)} WHERE ${Sql.booleanValue(
    dsl.where,
  )}`;
};
