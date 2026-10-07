import type {
  DBColumnTypes,
  DBType,
} from "../../migration/column/columnTypes.js";
import type {
  Reference,
  SerializedNormalColumn,
} from "../../migration/serialized/serializedColumn.js";
import { createSqlGenerator, type SqlGenerator } from "../sqlGenerator.js";
import { columnToSql } from "./columnToSql.js";
import { postgresType } from "./postgres.js";

export function createSqlCreator(generator: SqlGenerator) {
  const SqlString = generator;
  return Object.freeze({
    addColumn: (tableName: string, column: SerializedNormalColumn): string =>
      `ALTER TABLE ${generator.dialect === "postgres" ? SqlString.escapeId(tableName) : tableName} ADD COLUMN ${columnToSql(column, generator)}`,
    dropColumn: (tableName: string, columnName: string): string =>
      `ALTER TABLE ${generator.dialect === "postgres" ? SqlString.escapeId(tableName) : tableName} DROP COLUMN ${generator.dialect === "postgres" ? SqlString.escapeId(columnName) : columnName}`,
    addUniqueKey: (tableName: string, columns: string[]): string =>
      generator.dialect === "postgres"
        ? `ALTER TABLE ${SqlString.escapeId(tableName)} ADD UNIQUE (${columns.map(SqlString.escapeId).join(",")})`
        : `ALTER TABLE ${tableName} ADD UNIQUE ${columns.join("__")}(${columns.join(
            ",",
          )})`,
    addPrimaryKey: (tableName: string, columns: string[]): string =>
      generator.dialect === "postgres"
        ? `ALTER TABLE ${SqlString.escapeId(tableName)} ADD PRIMARY KEY (${columns.map(SqlString.escapeId).join(",")})`
        : `ALTER TABLE ${tableName} ADD PRIMARY KEY ${columns.join(
            "__",
          )}(${columns.join(",")})`,
    addForeignKey: (
      tableName: string,
      constraintName: string,
      reference: Reference,
    ): string => {
      if (generator.dialect === "postgres") {
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
    changeColumnType: (table: string, column: string, type: DBType): string =>
      generator.dialect === "postgres"
        ? `ALTER TABLE ${generator.escapeId(table)} ALTER COLUMN ${generator.escapeId(column)} TYPE ${postgresType({ type: type as DBColumnTypes, length: undefined, scale: undefined })}`
        : `ALTER TABLE ${table} MODIFY ${column} ${type}`,
    setDefault: (
      table: string,
      column: string,
      value: string | number | bigint | null,
    ): string =>
      `ALTER TABLE ${generator.dialect === "postgres" ? generator.escapeId(table) : table} ALTER ${generator.dialect === "postgres" ? generator.escapeId(column) : column} SET DEFAULT ${generator.escape(value)}`,
  });
}

export const SqlCreator: ReturnType<typeof createSqlCreator> = {
  addColumn: (...args) => createSqlGenerator().alter.addColumn(...args),
  dropColumn: (...args) => createSqlGenerator().alter.dropColumn(...args),
  addUniqueKey: (...args) => createSqlGenerator().alter.addUniqueKey(...args),
  addPrimaryKey: (...args) => createSqlGenerator().alter.addPrimaryKey(...args),
  addForeignKey: (...args) => createSqlGenerator().alter.addForeignKey(...args),
  changeColumnType: (...args) =>
    createSqlGenerator().alter.changeColumnType(...args),
  setDefault: (...args) => createSqlGenerator().alter.setDefault(...args),
};
