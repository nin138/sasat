import type {
  Reference,
  SerializedNormalColumn,
} from "../../migration/serialized/serializedColumn.js";
import { SqlString } from "../../runtime/sql/sqlString.js";
import { getDialect } from "../dialect.js";
import { columnToSql } from "./columnToSql.js";

export const SqlCreator = {
  addColumn: (tableName: string, column: SerializedNormalColumn): string =>
    `ALTER TABLE ${getDialect() === "postgres" ? SqlString.escapeId(tableName) : tableName} ADD COLUMN ${columnToSql(column)}`,
  dropColumn: (tableName: string, columnName: string): string =>
    `ALTER TABLE ${getDialect() === "postgres" ? SqlString.escapeId(tableName) : tableName} DROP COLUMN ${getDialect() === "postgres" ? SqlString.escapeId(columnName) : columnName}`,
  addUniqueKey: (tableName: string, columns: string[]): string =>
    getDialect() === "postgres"
      ? `ALTER TABLE ${SqlString.escapeId(tableName)} ADD UNIQUE (${columns.map(SqlString.escapeId).join(",")})`
      : `ALTER TABLE ${tableName} ADD UNIQUE ${columns.join("__")}(${columns.join(
          ",",
        )})`,
  addPrimaryKey: (tableName: string, columns: string[]): string =>
    getDialect() === "postgres"
      ? `ALTER TABLE ${SqlString.escapeId(tableName)} ADD PRIMARY KEY (${columns.map(SqlString.escapeId).join(",")})`
      : `ALTER TABLE ${tableName} ADD PRIMARY KEY ${columns.join(
          "__",
        )}(${columns.join(",")})`,
  addForeignKey: (
    tableName: string,
    constraintName: string,
    reference: Reference,
  ): string => {
    if (getDialect() === "postgres") {
      const q = SqlString.escapeId;
      return `ALTER TABLE ${q(tableName)} ADD CONSTRAINT ${q(constraintName)} FOREIGN KEY (${q(reference.columnName)}) REFERENCES ${q(reference.parentTable)}(${q(reference.parentColumn)})${reference.onUpdate ? " ON UPDATE " + reference.onUpdate : ""}${reference.onDelete ? " ON DELETE " + reference.onDelete : ""}`;
    }
    const onUpdate = reference.onUpdate
      ? " ON UPDATE " + reference.onUpdate
      : "";
    const onDelete = reference.onDelete
      ? " ON DELETE " + reference.onDelete
      : "";
    return `ALTER TABLE ${tableName} ADD CONSTRAINT \`${constraintName}\` FOREIGN KEY (${reference.columnName}) REFERENCES ${reference.parentTable}(${reference.parentColumn})${onUpdate}${onDelete}`;
  },
};
