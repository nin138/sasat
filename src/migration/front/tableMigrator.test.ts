import { StoreMigrator } from "./storeMigrator.js";

function setup() {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("owners", (table) => {
    table.column("id").int().primary();
    table.column("name").varchar(40);
  });
  store.createTable("records", (table) => {
    table.column("id").int().primary();
    table.column("owner_id").int().nullable();
  });
  store.resetQueue();
  return store;
}
const reference = {
  columnName: "owner_id",
  parentTable: "owners",
  parentColumn: "id",
  relation: "Many" as const,
  onDelete: "CASCADE" as const,
};

test.each([
  [{ parentTable: "missing" }, "Not Found"],
  [{ parentColumn: "missing" }, "Not Found"],
  [{ columnName: "missing" }, "Not Found"],
  [{ parentColumn: "name" }, "different Type"],
] as const)(
  "failed foreign key addition keeps schema and queued SQL unchanged: %j",
  (override, message) => {
    const store = setup();
    const before = store.serialize();
    expect(() =>
      store.table("records").addForeignKey({ ...reference, ...override }),
    ).toThrow(message);
    expect(store.serialize()).toEqual(before);
    expect(store.getSql()).toEqual([]);
  },
);

test("adds a foreign key with its original column attributes and rejects duplicates atomically", () => {
  const store = setup();
  store.table("records").addForeignKey(reference);
  expect(store.table("records").column("owner_id").data).toMatchObject({
    hasReference: true,
    notNull: false,
    type: "int",
    reference,
  });
  expect(store.getSql()).toHaveLength(1);
  expect(store.getSql()[0]).toContain("ON DELETE CASCADE");
  const before = store.serialize();
  const sql = [...store.getSql()];
  expect(() => store.table("records").addForeignKey(reference)).toThrow(
    "already has reference",
  );
  expect(store.serialize()).toEqual(before);
  expect(store.getSql()).toEqual(sql);
});
