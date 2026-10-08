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
  /** undefined represents an omitted value and emits SQL DEFAULT; null emits NULL. */
  entities: (SqlValueType | undefined)[][];
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

export const renderCreate = (
  dsl: Create,
  tableInfo: TableInfo,
  generator: SqlGenerator,
  renderValue: (value: SqlValueType) => string = generator.escape,
): string => {
  if (dsl.entities.length === 0)
    throw new Error("INSERT requires at least one row");
  const escapeId = generator.escapeId;
  const map = tableInfo[dsl.table].columnMap;
  const valueToSql = (value: SqlValueType | undefined): string =>
    value === undefined ? "DEFAULT" : renderValue(value);
  if (generator.dialect === "postgres") {
    // PostgreSQL has no multi-row DEFAULT VALUES syntax; use a mapped column.
    const fields =
      dsl.fields.length === 0 && dsl.entities.length > 1
        ? [Object.keys(map)[0]]
        : dsl.fields;
    if (fields.some((field) => field === undefined))
      throw new Error("Bulk default inserts require a mapped column");
    const entities = dsl.fields.length
      ? dsl.entities
      : dsl.entities.map(() => fields.map(() => undefined));
    const columns = fields.map((it) => escapeId(map[it])).join(",");
    const values = fields.length
      ? `(${columns}) VALUES ${entities.map((row) => `(${row.map(valueToSql).join(",")})`).join(",")}`
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
    .map((it) => `(${it.map(valueToSql).join(",")})`)
    .join(",");
  return `INSERT ${dsl.ignore ? "IGNORE " : ""}INTO ${escapeId(
    dsl.table,
  )}(${dsl.fields.map((it) => escapeId(map[it]))}) VALUES ${values} ${onDuplicateKeyUpdate(dsl.upsert, generator)}`;
};

export const renderUpdate = (
  dsl: Update,
  tableInfo: TableInfo,
  generator: SqlGenerator,
  renderValue: (value: SqlValueType) => string = generator.escape,
  Sql = generator.nodes,
): string => {
  const escapeId = generator.escapeId;
  const map = tableInfo[dsl.table].columnMap;

  return `UPDATE ${escapeId(dsl.table)} SET ${dsl.values
    .map((it) => escapeId(map[it.field]) + " = " + renderValue(it.value))
    .join(", ")} WHERE ${Sql.booleanValue(dsl.where)}`;
};

export const renderDelete = (
  dsl: Delete,
  generator: SqlGenerator,
  Sql = generator.nodes,
): string => {
  const escapeId = generator.escapeId;
  return `DELETE FROM ${escapeId(dsl.table)} WHERE ${Sql.booleanValue(
    dsl.where,
  )}`;
};

export const createToSql = (
  dsl: Create,
  tableInfo: TableInfo,
  generator: SqlGenerator = createSqlGenerator(),
): string => renderCreate(dsl, tableInfo, generator);

export const updateToSql = (
  dsl: Update,
  tableInfo: TableInfo,
  generator: SqlGenerator = createSqlGenerator(),
): string => renderUpdate(dsl, tableInfo, generator);

export const deleteToSql = (
  dsl: Delete,
  generator: SqlGenerator = createSqlGenerator(),
): string => renderDelete(dsl, generator);
