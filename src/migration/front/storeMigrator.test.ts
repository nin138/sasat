import { DataStoreHandler } from "../dataStore.js";
import { Mutations } from "../makeMutaion.js";
import { Queries } from "../makeQuery.js";
import { StoreMigrator } from "./storeMigrator.js";

const makeStore = () => {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("users", (table) => {
    table.autoIncrementHashId("id");
    table.column("display_name").varchar(80).fieldName("name").unique();
    table.createdAt().updatedAt().enableGQL();
    table.addGQLQuery(Queries.primary(), Queries.listAll("users"));
    table.addGQLMutation(Mutations.create());
  });
  return store;
};

test("creates tables and queues SQL with keys and timestamp columns", () => {
  const store = makeStore();
  expect(store.table("users").primaryKey).toEqual(["id"]);
  expect(store.getSql()).toHaveLength(1);
  expect(store.getSql()[0]).toContain("PRIMARY KEY (`id`)");
  expect(store.getSql()[0]).toContain("UNIQUE KEY (display_name)");
  expect(store.table("users").gqlOption).toMatchObject({
    enabled: true,
    queries: [{ type: "primary" }, { type: "list-all" }],
  });
  expect(store.table("users").column("id").isNullableOnCreate()).toBe(true);
  expect(store.table("users").column("display_name").isNullableOnCreate()).toBe(
    false,
  );
  expect(store.table("users").column("id").isUpdatable()).toBe(false);
});

test("rejects duplicate tables and missing lookups", () => {
  const store = makeStore();
  expect(() => store.createTable("users", () => {})).toThrow("already exist");
  expect(() => store.table("missing")).toThrow("Not Found");
  expect(() => store.table("users").column("missing")).toThrow("users.missing");
});

test("rejects duplicate column names", () => {
  const store = StoreMigrator.deserialize({ tables: [] });
  expect(() =>
    store.createTable("users", (table) => {
      table.column("id").int();
      table.column("id").int();
    }),
  ).toThrow("already exists");
});

test("creates indexes from column names only", () => {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("users", (table) => {
    table.column("id").int().primary();
    table.addIndex("id");
  });
  expect(store.getSql()[1]).toBe(
    "ALTER TABLE users ADD INDEX index_users__id(id)",
  );
});

test("alters columns and removes a column by its database name", () => {
  const store = makeStore();
  store.resetQueue();
  store.table("users").addColumn("age", (column) => column.int().default(0));
  store.table("users").setDefault("age", 18).changeColumnType("age", "bigint");
  store.table("users").dropColumn("display_name");
  expect(store.table("users").column("age").data).toMatchObject({
    type: "bigint",
    default: 18,
  });
  expect(() => store.table("users").column("display_name")).toThrow(
    "Not Found",
  );
  expect(store.getSql()).toEqual([
    "ALTER TABLE users ADD COLUMN `age` int NOT NULL DEFAULT 0",
    "ALTER TABLE users ALTER age SET DEFAULT 18",
    "ALTER TABLE users MODIFY age bigint",
    "ALTER TABLE users DROP COLUMN display_name",
  ]);
});

test("queues index additions and removals", () => {
  const store = makeStore();
  store.resetQueue();
  store.table("users").addIndex("display_name").removeIndex("display_name");
  expect(store.table("users").getIndexes()).toEqual([]);
  expect(store.getSql()).toEqual([
    "ALTER TABLE users ADD INDEX index_users__display_name(display_name)",
    "DROP INDEX index_users__display_name ON users",
  ]);
});

test("serializes and restores references without queuing SQL", () => {
  const store = makeStore();
  store.createTable("posts", (table) => {
    table.column("id").int().primary();
    table
      .references({
        columnName: "user_id",
        parentTable: "users",
        parentColumn: "id",
        relation: "Many",
        onDelete: "CASCADE",
      })
      .nullable();
  });
  const restored = StoreMigrator.deserialize(store.serialize());
  expect(restored.serialize()).toEqual(store.serialize());
  expect(restored.getSql()).toEqual([]);
  const data = new DataStoreHandler(restored.serialize());
  expect(data.referencedBy("users")).toHaveLength(1);
  expect(data.table("posts").column("user_id").data).toMatchObject({
    hasReference: true,
    notNull: false,
    autoIncrement: false,
  });
  expect(data.table("posts").showCreateTable()).toContain("ON DELETE CASCADE");
  expect(() => data.table("missing")).toThrow("Not Found");
});

test("drops tables, queues raw SQL, and retains configuration updates", () => {
  const store = makeStore();
  store.resetQueue();
  store.sql("SELECT 1", "SELECT 2").dropTable("users");
  expect(store.serialize().tables).toEqual([]);
  expect(store.getSql()).toEqual(["SELECT 1", "SELECT 2", "DROP TABLE users"]);
  store.setConfig({ generator: { gql: { subscription: false } } });
  expect(store.getUpdateConfig()).toEqual({
    generator: { gql: { subscription: false } },
  });
});
