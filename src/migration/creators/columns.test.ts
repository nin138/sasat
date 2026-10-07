import { columnToSql } from "../../db/sql/columnToSql.js";
import { columnTypeToGqlPrimitive } from "../../generatorv2/scripts/columnToGqlType.js";
import { columnTypeToTsType, DBColumnTypes } from "../column/columnTypes.js";
import {
  AutoIncrementIDColumnBuilder,
  BooleanColumnBuilder,
} from "./columnBuilder.js";
import { createColumn } from "./createColumn.js";

test.each([
  ["char", "char"],
  ["varchar", "varchar"],
  ["text", "text"],
  ["tinyInt", "tinyint"],
  ["smallInt", "smallint"],
  ["mediumInt", "mediumint"],
  ["int", "int"],
  ["bigInt", "bigint"],
  ["float", "float"],
  ["double", "double"],
  ["decimal", "decimal"],
  ["year", "year"],
  ["date", "date"],
  ["time", "time"],
  ["dateTime", "datetime"],
  ["timestamp", "timestamp"],
] as const)("creates a %s column", (method, type) => {
  const result = createColumn("value")[method](20).build();
  expect(result.data).toMatchObject({
    columnName: "value",
    fieldName: "value",
    type,
    notNull: true,
    hasReference: false,
  });
  expect(result.isPrimary).toBe(false);
});

test("preserves numeric options in SQL", () => {
  const column = createColumn("amount")
    .decimal(10, 2)
    .unsigned()
    .zerofill()
    .default(0)
    .nullable()
    .build().data;
  expect(columnToSql(column)).toBe(
    "`amount` decimal (10,2) UNSIGNED ZEROFILL NULL DEFAULT 0",
  );
});

test("preserves string length, escaped defaults, and field aliases", () => {
  const result = createColumn("display_name")
    .varchar(80)
    .fieldName("name")
    .default("O'Reilly")
    .unique()
    .updatable(false)
    .build();
  expect(result.data).toMatchObject({
    fieldName: "name",
    length: 80,
    option: { updatable: false },
  });
  expect(result.isUnique).toBe(true);
  expect(columnToSql(result.data)).toBe(
    "`display_name` varchar (80) NOT NULL DEFAULT 'O\\'Reilly'",
  );
});

test("supports timestamp defaults and automatic updates", () => {
  expect(
    columnToSql(
      createColumn("updatedAt")
        .timestamp()
        .defaultCurrentTimeStamp()
        .onUpdateCurrentTimeStamp()
        .build().data,
    ),
  ).toBe(
    "`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  );
  expect(
    columnToSql(
      createColumn("note").text().default(null).nullable().build().data,
    ),
  ).toContain("NULL DEFAULT NULL");
});

test("creates hash IDs and independent column options", () => {
  const id = new AutoIncrementIDColumnBuilder("id", {
    bigint: true,
    salt: "test",
  }).build();
  expect(id.isPrimary).toBe(true);
  expect(id.data).toMatchObject({
    type: "bigint",
    autoIncrement: true,
    signed: false,
    option: { hashSalt: "test", autoIncrementHashId: true },
  });
  createColumn("first").int().updatable(false);
  expect(createColumn("second").int().build().data.option.updatable).toBe(true);
  expect(
    new BooleanColumnBuilder("enabled").default(false).build().data.default,
  ).toBe(false);
});

test.each([
  [DBColumnTypes.char, "string", "String"],
  [DBColumnTypes.varchar, "string", "String"],
  [DBColumnTypes.text, "string", "String"],
  [DBColumnTypes.tinyInt, "number", "Int"],
  [DBColumnTypes.smallInt, "number", "Int"],
  [DBColumnTypes.mediumInt, "number", "Int"],
  [DBColumnTypes.int, "number", "Int"],
  [DBColumnTypes.bigInt, "bigint", "BigInt"],
  [DBColumnTypes.float, "number", "Float"],
  [DBColumnTypes.double, "number", "Float"],
  [DBColumnTypes.decimal, "string", "Decimal"],
  [DBColumnTypes.year, "number", "Int"],
  [DBColumnTypes.date, "string", "String"],
  [DBColumnTypes.time, "string", "String"],
  [DBColumnTypes.dateTime, "string", "String"],
  [DBColumnTypes.timestamp, "string", "String"],
  [DBColumnTypes.boolean, "boolean", "Boolean"],
])("maps %s to TypeScript and GraphQL types", (type, tsType, gqlType) => {
  expect(columnTypeToTsType(type as DBColumnTypes)).toBe(tsType);
  expect(columnTypeToGqlPrimitive(type as DBColumnTypes)).toBe(gqlType);
});
