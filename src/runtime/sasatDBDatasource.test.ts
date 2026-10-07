import { config, setConfig } from "../config/config.js";
import { createSqlGenerator } from "../db/sqlGenerator.js";
import { QExpr as q } from "./dsl/factory.js";
import type { Fields } from "./field.js";
import { SasatDBDatasource } from "./sasatDBDatasource.js";

type User = { id: number; name: string; active: boolean };
class Users extends SasatDBDatasource<
  User,
  { id: number },
  { name: string },
  { id: number; name?: string },
  Fields<User>,
  User
> {
  tableName = "users";
  fields = ["id", "name", "active"];
  primaryKeys = ["user_id"];
  identifyFields = ["id"];
  autoIncrementColumn = "id";
  relationMap = { users: {} };
  tableInfo = {
    users: {
      identifiableKeys: ["user_id"],
      identifiableFields: ["id"],
      columnMap: { id: "user_id", name: "display_name", active: "active" },
    },
  };
  getDefaultValueString() {
    return { active: true };
  }
}

function fixture() {
  const client = {
    rawQuery: jest.fn().mockResolvedValue([]),
    rawCommand: jest
      .fn()
      .mockResolvedValue({ insertId: 7, affectedRows: 1, changedRows: 1 }),
  };
  return { client, users: new Users(client) };
}

test("creates an entity using defaults and the returned auto-increment ID", async () => {
  const { users, client } = fixture();
  await expect(users.create({ name: "Ada" })).resolves.toEqual({
    id: 7,
    active: true,
    name: "Ada",
  });
  expect(client.rawCommand).toHaveBeenCalledWith(
    expect.stringContaining("(`active`,`display_name`) VALUES (true,'Ada')"),
  );
});

test("skips empty bulk inserts and supports upsert column mappings", async () => {
  const { users, client } = fixture();
  await expect(users.createBulk([])).resolves.toBeNull();
  expect(client.rawCommand).not.toHaveBeenCalled();
  await users.createBulk([{ name: "Ada" }, { name: "Lin" }], { ignore: true });
  expect(client.rawCommand).toHaveBeenLastCalledWith(
    expect.stringContaining("VALUES (true,'Ada'),(true,'Lin')"),
  );
  await users.upsert({ name: "Ada" }, ["name"]);
  expect(client.rawCommand).toHaveBeenLastCalledWith(
    expect.stringContaining(
      "ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`)",
    ),
  );
});

test("omits undefined update values and restricts updates and deletes by ID", async () => {
  const { users, client } = fixture();
  await users.update({ id: 1, name: undefined });
  expect(client.rawCommand).toHaveBeenLastCalledWith(
    "UPDATE `users` SET `user_id` = 1 WHERE `users`.`user_id`  = 1",
  );
  await users.delete({ id: 1 });
  expect(client.rawCommand).toHaveBeenLastCalledWith(
    "DELETE FROM `users` WHERE `users`.`user_id`  = 1",
  );
  expect(() => users.update({} as { id: number })).toThrow(
    "field id is required",
  );
});

test("accepts zero as a valid identifiable value", async () => {
  const { users, client } = fixture();
  await users.delete({ id: 0 });
  expect(client.rawCommand).toHaveBeenCalledWith(
    expect.stringContaining("= 0"),
  );
});

test("supports explicit update and delete conditions", async () => {
  const { users, client } = fixture();
  const where = q.eq(q.field("users", "active"), q.value(false));
  await users.updateWhere({ name: "inactive" }, where);
  expect(client.rawCommand).toHaveBeenLastCalledWith(
    expect.stringContaining("WHERE `users`.`active`  = false"),
  );
  await users.deleteWhere(where);
  expect(client.rawCommand).toHaveBeenLastCalledWith(
    expect.stringContaining("DELETE FROM"),
  );
});

test("hydrates finds and returns null for an empty first result", async () => {
  const { users, client } = fixture();
  await expect(users.first()).resolves.toBeNull();
  client.rawQuery.mockResolvedValue([{ t0__id: 1, t0__name: "Ada" }]);
  await expect(users.find({ fields: ["name"] })).resolves.toEqual([
    { id: 1, name: "Ada" },
  ]);
  expect(client.rawQuery).toHaveBeenLastCalledWith(
    "SELECT `t0`.`display_name` AS `t0__name`, `t0`.`user_id` AS `t0__id` FROM `users` AS `t0`",
  );
  await expect(users.first()).resolves.toEqual({ id: 1, name: "Ada" });
});

test("paginates the parent query before joining results", async () => {
  const { users, client } = fixture();
  await users.findPageable(
    { numberOfItem: 10, offset: 20 },
    { fields: ["name"] },
  );
  expect(client.rawQuery).toHaveBeenCalledWith(
    expect.stringContaining("FROM (SELECT"),
  );
  expect(client.rawQuery).toHaveBeenCalledWith(
    expect.stringContaining("LIMIT 10 OFFSET 20) AS `t0`"),
  );
});

test("propagates database failures", async () => {
  const { users, client } = fixture();
  client.rawQuery.mockRejectedValue(new Error("unavailable"));
  await expect(users.find()).rejects.toThrow("unavailable");
});

test("injected executors retain their generator when global config changes", async () => {
  const original = config().db.dialect ?? "mysql";
  try {
    for (const dialect of ["postgres", "mysql"] as const) {
      const { client } = fixture();
      const users = new Users({ ...client, sql: createSqlGenerator(dialect) });
      setConfig({
        db: { dialect: dialect === "mysql" ? "postgres" : "mysql" },
      });
      await users.create({ name: "Ada" });
      await users.find();
      const quote = dialect === "postgres" ? '"' : "`";
      expect(client.rawCommand).toHaveBeenCalledWith(
        expect.stringContaining(quote + "display_name" + quote),
      );
      expect(client.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining(quote + "users" + quote),
      );
      if (dialect === "postgres")
        expect(client.rawCommand).toHaveBeenCalledWith(
          expect.stringContaining('RETURNING "user_id"'),
        );
    }
  } finally {
    setConfig({ db: { dialect: original } });
  }
});

test("legacy dialect-only executors are resolved once when constructing the data source", async () => {
  const original = config().db.dialect ?? "mysql";
  try {
    const { client } = fixture();
    const users = new Users({ ...client, dialect: "postgres" });
    setConfig({ db: { dialect: "mysql" } });
    await users.findPageable({ numberOfItem: 1 }, { fields: ["name"] });
    expect(client.rawQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM (SELECT "t0"."user_id"'),
    );
    expect(client.rawQuery).toHaveBeenCalledWith(
      expect.not.stringContaining(String.fromCharCode(96)),
    );
  } finally {
    setConfig({ db: { dialect: original } });
  }
});
