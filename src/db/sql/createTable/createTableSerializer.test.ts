import { serializeCreateTable } from "./createTableSerializer.js";

test("parses columns, composite keys, indexes, and escaped strings", () => {
  const table = serializeCreateTable(`
    CREATE TABLE \`users\` (
      \`id\` int unsigned NOT NULL AUTO_INCREMENT,
      \`tenant_id\` int NOT NULL,
      \`display_name\` varchar(80) DEFAULT 'Ada',
      PRIMARY KEY (\`id\`, \`tenant_id\`),
      UNIQUE KEY \`unique_name\` (\`display_name\`),
      KEY \`tenant\` (\`tenant_id\`)
    )
  `);
  expect(table.tableName).toBe("users");
  expect(table.primaryKey).toEqual(["id", "tenant_id"]);
  expect(table.uniqueKeys).toEqual([["display_name"]]);
  expect(table.indexes).toEqual([
    { constraintName: "tenant", columns: ["tenant_id"] },
  ]);
  expect(table.columns[0]).toMatchObject({
    type: "int",
    signed: false,
    notNull: true,
    autoIncrement: true,
  });
  expect(table.columns[2]).toMatchObject({
    type: "varchar",
    length: 80,
    fieldName: "displayName",
    default: "Ada",
  });
});

test("parses decimal precision and scale", () => {
  const table = serializeCreateTable(
    "CREATE TABLE prices (amount decimal(10,2) NOT NULL DEFAULT 1.25)",
  );
  expect(table.columns[0]).toMatchObject({
    length: 10,
    scale: 2,
    default: "1.25",
  });
});

test("preserves multi-word foreign-key actions", () => {
  const table = serializeCreateTable(`
    CREATE TABLE posts (
      id int NOT NULL,
      user_id int NULL,
      PRIMARY KEY (id),
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE NO ACTION
    )
  `);
  expect(table.columns[1]).toMatchObject({
    hasReference: true,
    reference: {
      parentTable: "users",
      parentColumn: "id",
      columnName: "user_id",
      relation: "Many",
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },
  });
});

test("rejects an unmatched opening parenthesis", () => {
  expect(() => serializeCreateTable("CREATE TABLE users (id int")).toThrow(
    "Closing Parenthesis Not Found",
  );
});

test("normalizes numeric field names and parses timestamp options", () => {
  const table = serializeCreateTable(
    "CREATE TABLE events (`1st` varchar(5), updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)",
  );
  expect(table.columns[0].fieldName).toBe("_1st");
  expect(table.columns[1]).toMatchObject({
    defaultCurrentTimeStamp: true,
    onUpdateCurrentTimeStamp: true,
  });
});

test("imports bigint and decimal defaults without converting through number", () => {
  const table = serializeCreateTable(
    "CREATE TABLE exact_values (id bigint DEFAULT 9007199254740993, amount decimal(38,18) DEFAULT 12345678901234567890.123456789012345678)",
  );
  expect(table.columns.map((column) => column.default)).toEqual([
    "9007199254740993",
    "12345678901234567890.123456789012345678",
  ]);
});

test.each([
  ["bigint", "-9007199254740993", "-9007199254740993"],
  [
    "decimal(38,18)",
    "-12345678901234567890.123456789012345678",
    "-12345678901234567890.123456789012345678",
  ],
  ["int", "-42", -42],
  ["double", "1.5e-3", 0.0015],
] as const)(
  "imports signed and exponential defaults for %s",
  (type, literal, expected) => {
    expect(
      serializeCreateTable(
        `CREATE TABLE values_table (value ${type} DEFAULT ${literal})`,
      ).columns[0].default,
    ).toBe(expected);
  },
);

test("accepts CRLF and tabs as SQL whitespace", () => {
  const table = serializeCreateTable(
    "CREATE TABLE\r\nrecords (\r\n\tid int NOT NULL,\r\nPRIMARY KEY (id)\r\n)",
  );
  expect(table.tableName).toBe("records");
  expect(table.primaryKey).toEqual(["id"]);
  expect(table.columns[0]).toMatchObject({
    columnName: "id",
    type: "int",
    notNull: true,
  });
});

test("uses unique foreign keys for optional single relations and names repeated references", () => {
  const table = serializeCreateTable(`CREATE TABLE records (
    owner int, reviewer int, UNIQUE KEY owner_unique (owner),
    CONSTRAINT owner_fk FOREIGN KEY (owner) REFERENCES accounts (id),
    CONSTRAINT reviewer_fk FOREIGN KEY (reviewer) REFERENCES accounts (id)
  )`);
  expect(table.columns[0]).toMatchObject({
    reference: { relation: "OneOrZero" },
  });
  expect(table.columns[1]).toMatchObject({
    reference: { relation: "Many", relationName: "accounts1" },
  });
});

test.each(["'open", '"open', "`open"])(
  "rejects unterminated quoted literals %s",
  (value) => {
    expect(() =>
      serializeCreateTable(
        `CREATE TABLE records (name varchar(40) DEFAULT ${value})`,
      ),
    ).toThrow("Non Terminated String");
  },
);

test("rejects malformed numeric literals instead of silently rounding or truncating", () => {
  expect(() =>
    serializeCreateTable(
      "CREATE TABLE records (amount decimal(10,2) DEFAULT 12oops)",
    ),
  ).toThrow("fail to read number");
});
