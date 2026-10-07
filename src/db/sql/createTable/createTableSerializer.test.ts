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
