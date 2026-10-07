import { DBColumnTypes } from "../../migration/column/columnTypes.js";
import { defaultGQLOption } from "../../migration/data/GQLOption.js";
import {
  defaultColumnOption,
  type SerializedColumn,
  type SerializedNormalColumn,
} from "../../migration/serialized/serializedColumn.js";
import type {
  SerializedStore,
  SerializedTable,
} from "../../migration/serialized/serializedStore.js";
import type { SQLExecutor } from "../connectors/dbClient.js";

/** Import representable tables from the connection's current schema. */
export async function readPostgresSchema(
  client: SQLExecutor,
): Promise<SerializedStore> {
  const columns =
    await client.rawQuery(`SELECT c.table_name, c.column_name, c.data_type, c.character_maximum_length, c.numeric_precision, c.numeric_scale, c.is_nullable, c.is_identity, c.column_default
    FROM information_schema.columns c JOIN information_schema.tables t USING (table_catalog, table_schema, table_name)
    WHERE c.table_schema = current_schema() AND t.table_type = 'BASE TABLE' ORDER BY c.table_name, c.ordinal_position`);
  const tables = new Map<string, SerializedTable>();
  const mapping: Record<string, DBColumnTypes> = {
    smallint: DBColumnTypes.smallInt,
    integer: DBColumnTypes.int,
    bigint: DBColumnTypes.bigInt,
    real: DBColumnTypes.float,
    "double precision": DBColumnTypes.double,
    numeric: DBColumnTypes.decimal,
    "character varying": DBColumnTypes.varchar,
    character: DBColumnTypes.char,
    text: DBColumnTypes.text,
    date: DBColumnTypes.date,
    "time without time zone": DBColumnTypes.time,
    "timestamp without time zone": DBColumnTypes.timestamp,
    boolean: DBColumnTypes.boolean,
  };
  for (const row of columns) {
    const tableName = String(row.table_name),
      name = String(row.column_name),
      dataType = String(row.data_type);
    const type = mapping[dataType];
    if (!type)
      throw new Error(
        `Cannot import PostgreSQL type ${dataType} on ${tableName}.${name}`,
      );
    if (!tables.has(tableName))
      tables.set(tableName, {
        tableName,
        columns: [],
        primaryKey: [],
        uniqueKeys: [],
        indexes: [],
        gqlOption: defaultGQLOption(),
        virtualRelations: [],
      });
    const expression =
      row.column_default == null ? undefined : String(row.column_default);
    const identity =
      row.is_identity === "YES" || !!expression?.startsWith("nextval(");
    const currentTime =
      expression === "CURRENT_TIMESTAMP" || expression === "now()";
    let value: SerializedNormalColumn["default"];
    if (expression && !identity && !currentTime) {
      if (/^NULL(?:::.*)?$/i.test(expression)) value = null;
      else if (expression === "true" || expression === "false")
        value = expression === "true";
      else if (/^-?\d+(\.\d+)?$/.test(expression)) value = Number(expression);
      else {
        const quoted = expression.match(/^'((?:''|[^'])*)'(?:::.*)?$/s);
        if (!quoted)
          throw new Error(
            `Cannot import PostgreSQL default expression on ${tableName}.${name}`,
          );
        value = quoted[1].replaceAll("''", "'");
      }
    }
    tables.get(tableName)!.columns.push({
      hasReference: false,
      columnName: name,
      fieldName: name,
      type,
      notNull: row.is_nullable === "NO",
      default: currentTime ? "CURRENT_TIMESTAMP" : value,
      zerofill: false,
      signed: undefined,
      autoIncrement: identity,
      length:
        type === DBColumnTypes.decimal
          ? row.numeric_precision == null
            ? undefined
            : Number(row.numeric_precision)
          : row.character_maximum_length == null
            ? undefined
            : Number(row.character_maximum_length),
      scale:
        type === DBColumnTypes.decimal && row.numeric_scale != null
          ? Number(row.numeric_scale)
          : undefined,
      defaultCurrentTimeStamp: currentTime,
      onUpdateCurrentTimeStamp: false,
      option: { ...defaultColumnOption },
    });
  }
  const constraints =
    await client.rawQuery(`SELECT t.relname AS table_name, c.contype, c.conname,
    ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(n, i) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.n ORDER BY k.i)::text[] AS columns,
    p.relname AS parent_table, pn.nspname AS parent_schema,
    ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(n, i) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.n ORDER BY k.i)::text[] AS parent_columns,
    c.confupdtype, c.confdeltype, current_schema() AS schema_name
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    LEFT JOIN pg_class p ON p.oid=c.confrelid LEFT JOIN pg_namespace pn ON pn.oid=p.relnamespace
    WHERE n.nspname=current_schema() AND c.contype IN ('p','u','f')`);
  const actions = {
    a: "NO ACTION",
    r: "RESTRICT",
    c: "CASCADE",
    n: "SET NULL",
  } as const;
  for (const raw of constraints) {
    const row = raw as unknown as {
      table_name: string;
      contype: string;
      columns: string[];
      parent_table: string;
      parent_schema: string;
      schema_name: string;
      parent_columns: string[];
      confupdtype: keyof typeof actions;
      confdeltype: keyof typeof actions;
    };
    const table = tables.get(row.table_name);
    if (!table) continue;
    if (row.contype === "p") table.primaryKey = row.columns;
    if (row.contype === "u") table.uniqueKeys.push(row.columns);
    if (row.contype === "f") {
      if (
        row.columns.length !== 1 ||
        row.parent_schema !== row.schema_name ||
        !actions[row.confupdtype] ||
        !actions[row.confdeltype]
      ) {
        throw new Error(
          `Cannot import composite, cross-schema, or unsupported foreign key on ${row.table_name}`,
        );
      }
      table.columns = table.columns.map((col) =>
        col.columnName !== row.columns[0]
          ? col
          : ({
              ...col,
              hasReference: true,
              reference: {
                columnName: row.columns[0],
                parentTable: row.parent_table,
                parentColumn: row.parent_columns[0],
                relation: "Many",
                onUpdate: actions[row.confupdtype],
                onDelete: actions[row.confdeltype],
              },
            } as SerializedColumn),
      );
    }
  }
  const indexes =
    await client.rawQuery(`SELECT t.relname AS table_name, idx.relname AS index_name, i.indisunique, i.indpred IS NOT NULL AS partial, i.indnatts <> i.indnkeyatts AS included, i.indnullsnotdistinct AS nulls_not_distinct,
    ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY k(n, ord) LEFT JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.n ORDER BY k.ord)::text[] AS columns
    FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class idx ON idx.oid=i.indexrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname=current_schema() AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid=i.indexrelid)`);
  for (const raw of indexes) {
    const row = raw as unknown as {
      table_name: string;
      index_name: string;
      indisunique: boolean;
      partial: boolean;
      included: boolean;
      nulls_not_distinct: boolean;
      columns: (string | null)[];
    };
    const table = tables.get(row.table_name);
    if (!table) continue;
    if (
      row.partial ||
      row.included ||
      row.nulls_not_distinct ||
      row.columns.some((c) => c === null)
    )
      throw new Error(
        `Cannot import partial, expression, INCLUDE, or NULLS NOT DISTINCT index ${row.index_name}`,
      );
    const cols = row.columns as string[];
    if (row.indisunique) table.uniqueKeys.push(cols);
    else table.indexes.push({ constraintName: row.index_name, columns: cols });
  }
  return {
    tables: [...tables.values()].filter((t) => t.primaryKey.length > 0),
  };
}
