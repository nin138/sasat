import { readPostgresSchema } from "./postgresSchema.js";

const column = (name: string, type = "integer", extra = {}) => ({
  table_name: "records",
  column_name: name,
  data_type: type,
  character_maximum_length: null,
  numeric_precision: null,
  numeric_scale: null,
  is_nullable: "YES",
  is_identity: "NO",
  column_default: null,
  ...extra,
});
const primary = { table_name: "records", contype: "p", columns: ["id"] };
const foreign = {
  table_name: "records",
  contype: "f",
  columns: ["owner_id"],
  parent_table: "owners",
  parent_schema: "public",
  schema_name: "public",
  parent_columns: ["id"],
  confupdtype: "a",
  confdeltype: "r",
};
const index = {
  table_name: "records",
  index_name: "by_owner",
  indisunique: false,
  partial: false,
  included: false,
  nulls_not_distinct: false,
  columns: ["owner_id"],
};
function fixture(
  columns = [column("id"), column("owner_id")],
  constraints: object[] = [primary],
  indexes: object[] = [],
) {
  return {
    rawQuery: jest
      .fn()
      .mockResolvedValueOnce(columns)
      .mockResolvedValueOnce(constraints)
      .mockResolvedValueOnce(indexes),
    rawCommand: jest.fn(),
  };
}

test.each([
  ["smallint", "smallint"],
  ["integer", "int"],
  ["bigint", "bigint"],
  ["real", "float"],
  ["double precision", "double"],
  ["numeric", "decimal"],
  ["character varying", "varchar"],
  ["character", "char"],
  ["text", "text"],
  ["date", "date"],
  ["time without time zone", "time"],
  ["timestamp without time zone", "timestamp"],
  ["boolean", "boolean"],
])("imports PostgreSQL %s as %s", async (type, expected) => {
  const result = await readPostgresSchema(fixture([column("id", type)]));
  expect(result.tables[0].columns[0]).toMatchObject({
    columnName: "id",
    fieldName: "id",
    type: expected,
    notNull: false,
    autoIncrement: false,
    default: undefined,
  });
});

test.each([
  ["integer", "-42", -42],
  ["double precision", "1.25", 1.25],
  ["bigint", "9007199254740993", "9007199254740993"],
  [
    "numeric",
    "12345678901234567890.123456789",
    "12345678901234567890.123456789",
  ],
  ["boolean", "true", true],
  ["boolean", "false", false],
  ["text", "NULL::text", null],
  ["text", "null", null],
  ["text", "'it''s a value'::text", "it's a value"],
  ["text", "''::text", ""],
  ["text", "'line\nbreak'::text", "line\nbreak"],
] as const)(
  "imports exact %s default %s",
  async (type, expression, expected) => {
    const result = await readPostgresSchema(
      fixture([column("id", type, { column_default: expression })]),
    );
    expect(result.tables[0].columns[0].default).toBe(expected);
  },
);

test.each(["CURRENT_TIMESTAMP", "now()"])(
  "recognizes timestamp default %s",
  async (expression) => {
    const result = await readPostgresSchema(
      fixture([
        column("id", "timestamp without time zone", {
          column_default: expression,
        }),
      ]),
    );
    expect(result.tables[0].columns[0]).toMatchObject({
      default: "CURRENT_TIMESTAMP",
      defaultCurrentTimeStamp: true,
    });
  },
);

test.each([
  { is_identity: "YES" },
  { column_default: "nextval('records_id_seq'::regclass)" },
])(
  "imports identity and serial columns without literal defaults: %p",
  async (extra) => {
    const result = await readPostgresSchema(
      fixture([column("id", "bigint", extra)]),
    );
    expect(result.tables[0].columns[0]).toMatchObject({
      autoIncrement: true,
      default: undefined,
    });
  },
);

test("preserves precision, scale, size, nullability, keys and index names", async () => {
  const result = await readPostgresSchema(
    fixture(
      [
        column("id", "integer", { is_nullable: "NO" }),
        column("amount", "numeric", {
          numeric_precision: 38,
          numeric_scale: 18,
        }),
        column("label", "character varying", { character_maximum_length: 80 }),
      ],
      [
        primary,
        { table_name: "records", contype: "u", columns: ["id", "label"] },
      ],
      [
        { ...index, columns: ["amount", "label"] },
        {
          ...index,
          index_name: "unique_label",
          indisunique: true,
          columns: ["label"],
        },
      ],
    ),
  );
  expect(result.tables[0]).toMatchObject({
    primaryKey: ["id"],
    uniqueKeys: [["id", "label"], ["label"]],
    indexes: [{ constraintName: "by_owner", columns: ["amount", "label"] }],
    columns: [
      { columnName: "id", notNull: true, length: undefined, scale: undefined },
      { columnName: "amount", length: 38, scale: 18 },
      { columnName: "label", length: 80, scale: undefined },
    ],
  });
});

test.each([
  ["a", "NO ACTION"],
  ["r", "RESTRICT"],
  ["c", "CASCADE"],
  ["n", "SET NULL"],
])("imports foreign key action %s", async (action, expected) => {
  const result = await readPostgresSchema(
    fixture(undefined, [
      primary,
      {
        ...foreign,
        confupdtype: action,
        confdeltype: action,
      },
    ]),
  );
  expect(result.tables[0].columns[0].hasReference).toBe(false);
  expect(result.tables[0].columns[1]).toMatchObject({
    hasReference: true,
    reference: {
      columnName: "owner_id",
      parentTable: "owners",
      parentColumn: "id",
      relation: "Many",
      onUpdate: expected,
      onDelete: expected,
    },
  });
});

test.each([
  { columns: ["owner_id", "id"] },
  { parent_schema: "other" },
  { confupdtype: "d" },
  { confdeltype: "d" },
])("rejects unrepresentable foreign keys: %p", async (extra) => {
  await expect(
    readPostgresSchema(fixture(undefined, [primary, { ...foreign, ...extra }])),
  ).rejects.toThrow("unsupported foreign key");
});
test.each([
  { partial: true },
  { included: true },
  { nulls_not_distinct: true },
  { columns: [null] },
])("rejects unrepresentable indexes: %p", async (extra) => {
  await expect(
    readPostgresSchema(fixture(undefined, undefined, [{ ...index, ...extra }])),
  ).rejects.toThrow("by_owner");
});
test.each(["jsonb", "ARRAY", "timestamp with time zone", "uuid"])(
  "rejects unsupported type %s",
  async (type) => {
    await expect(
      readPostgresSchema(fixture([column("id", type)])),
    ).rejects.toThrow(`Cannot import PostgreSQL type ${type} on records.id`);
  },
);
test.each(["random()", "(1 + 2)", "CURRENT_DATE"])(
  "rejects nonliteral default %s",
  async (expression) => {
    await expect(
      readPostgresSchema(
        fixture([column("id", "integer", { column_default: expression })]),
      ),
    ).rejects.toThrow("default expression on records.id");
  },
);
test("ignores catalog entries without imported tables and omits tables without primary keys", async () => {
  const client = fixture(
    [column("id"), column("name", "text", { table_name: "no_primary_key" })],
    [primary, { ...foreign, table_name: "missing" }],
    [{ ...index, table_name: "missing", partial: true }],
  );
  expect(
    (await readPostgresSchema(client)).tables.map((table) => table.tableName),
  ).toEqual(["records"]);
  expect(client.rawCommand).not.toHaveBeenCalled();
  expect(client.rawQuery).toHaveBeenCalledTimes(3);
});
test("returns an empty schema and propagates catalog query failures", async () => {
  await expect(readPostgresSchema(fixture([], [], []))).resolves.toEqual({
    tables: [],
  });
  const client = fixture();
  const failure = new Error("catalog unavailable");
  client.rawQuery.mockReset().mockRejectedValueOnce(failure);
  await expect(readPostgresSchema(client)).rejects.toBe(failure);
  expect(client.rawQuery).toHaveBeenCalledTimes(1);
});
