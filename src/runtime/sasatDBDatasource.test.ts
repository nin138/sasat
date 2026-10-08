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
  getDefaultValueString(): Partial<User> {
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

test.each(["mysql", "postgres"] as const)(
  "bulk inserts preserve later columns and omitted/default/null values (%s)",
  async (dialect) => {
    class OptionalUsers extends Users {
      getDefaultValueString() {
        return {};
      }
    }
    const { client } = fixture();
    const users = new OptionalUsers({
      ...client,
      sql: createSqlGenerator(dialect),
    });
    const input = [
      { name: "Ada" },
      { name: "Lin", active: null },
      { name: "Sam", active: true },
      { name: "Uma", active: undefined },
    ];
    for (const rows of [input, [...input].reverse()]) {
      await users.createBulk(rows);
      const sql = client.rawCommand.mock.calls.at(-1)![0] as string;
      expect(sql).toContain(dialect === "postgres" ? '"active"' : "`active`");
      expect(sql).toContain("DEFAULT");
      expect(sql).toContain("NULL");
      expect(sql).toContain(dialect === "postgres" ? "TRUE" : "true");
      expect(client.rawCommand).toHaveBeenCalledTimes(rows === input ? 1 : 2);
    }
  },
);

test("PostgreSQL bulk default-only rows use a mapped column without splitting the statement", async () => {
  class OptionalUsers extends Users {
    getDefaultValueString() {
      return {};
    }
  }
  const { client } = fixture();
  const users = new OptionalUsers({
    ...client,
    sql: createSqlGenerator("postgres"),
  });
  await users.createBulk([{}, {}] as never);
  expect(client.rawCommand).toHaveBeenCalledWith(
    'INSERT INTO "users" ("user_id") VALUES (DEFAULT),(DEFAULT)',
  );
});

test.each(["mysql", "postgres"] as const)(
  "an empty low-level INSERT cannot accidentally insert a default row (%s)",
  (dialect) => {
    expect(() =>
      createSqlGenerator(dialect).create(
        { table: "users", fields: [], entities: [] },
        {
          users: {
            columnMap: { id: "id" },
            identifiableKeys: ["id"],
            identifiableFields: ["id"],
          },
        },
      ),
    ).toThrow("INSERT requires at least one row");
  },
);

test.each(["mysql", "postgres"] as const)(
  "first bounds the SQL and preserves options (%s)",
  async (dialect) => {
    const { client } = fixture();
    const users = new Users({ ...client, sql: createSqlGenerator(dialect) });
    await users.first(undefined, {
      limit: 50,
      offset: 2,
      sort: [q.sort(q.field("t0", "user_id"), "DESC")],
      where: q.eq(q.field("t0", "active"), q.value(true)),
      lock: "FOR UPDATE",
    });
    const sql = client.rawQuery.mock.calls[0][0];
    expect(sql).toContain("LIMIT 1 OFFSET 2");
    expect(sql).toContain("ORDER BY");
    expect(sql).toContain("WHERE");
    expect(sql).toContain("FOR UPDATE");
    await users.first(undefined, { limit: 0 });
    expect(client.rawQuery.mock.calls[1][0]).toContain("LIMIT 0");
    for (const limit of [-1, NaN, Infinity, 0.5])
      await expect(users.first(undefined, { limit })).rejects.toThrow(
        "LIMIT must be",
      );
    for (const offset of [-1, NaN, Infinity, 0.5])
      await expect(users.first(undefined, { offset })).rejects.toThrow(
        "OFFSET must be",
      );
    expect(client.rawQuery).toHaveBeenCalledTimes(2);
  },
);

test("first retains overridden find filters when delegating to the base query", async () => {
  class ScopedUsers extends Users {
    override find(...args: Parameters<Users["find"]>) {
      const [fields, options, context] = args;
      return super.find(
        fields,
        {
          ...options,
          where: q.and(
            options?.where,
            q.eq(q.field("t0", "active"), q.value(true)),
          ),
        },
        context,
      );
    }
  }
  const { client } = fixture();
  const users = new ScopedUsers(client);
  const find = jest.spyOn(users, "find");
  await users.first(
    { fields: ["name"] },
    { where: q.eq(q.field("t0", "user_id"), q.value(7)) },
    { tenant: 42 },
  );
  expect(find).toHaveBeenCalledTimes(1);
  expect(find.mock.calls[0][2]).toEqual({ tenant: 42 });
  const sql = client.rawQuery.mock.calls[0][0];
  expect(sql).toContain("LIMIT 1");
  expect(sql).toContain("`t0`.`user_id`  = 7 AND `t0`.`active`  = true");
});

test.each(["mysql", "postgres"] as const)(
  "parameterized finds, first and paging hydrate results with the captured dialect (%s)",
  async (dialect) => {
    const original = config().db.dialect ?? "mysql";
    const { client: legacy } = fixture();
    const client = {
      ...legacy,
      sql: createSqlGenerator(dialect),
      supportsParameterizedStatements: true,
      executeQuery: jest
        .fn()
        .mockResolvedValue([{ t0__id: 1, t0__name: "Ada" }]),
    };
    const users = new Users(client);
    try {
      setConfig({
        db: { dialect: dialect === "mysql" ? "postgres" : "mysql" },
      });
      const where = q.eq(q.field("t0", "display_name"), q.value("O'Reilly"));
      await expect(users.find(undefined, { where })).resolves.toEqual([
        { id: 1, name: "Ada" },
      ]);
      await users.first(undefined, { where, offset: 2 });
      await users.findPageable({ numberOfItem: 3, offset: 4 }, undefined, {
        where,
      });
      expect(
        client.executeQuery.mock.calls.map(([statement]) => statement.values),
      ).toEqual([["O'Reilly"], ["O'Reilly", "1", "2"], ["O'Reilly", "3", "4"]]);
      const firstSql = client.executeQuery.mock.calls[1][0].text;
      expect(firstSql).toContain(
        dialect === "mysql" ? "LIMIT ? OFFSET ?" : "LIMIT $2 OFFSET $3",
      );
      expect(firstSql).not.toContain("O'Reilly");
      expect(client.rawQuery).not.toHaveBeenCalled();
      client.executeQuery.mockRejectedValueOnce(new Error("bound failure"));
      await expect(users.find()).rejects.toThrow("bound failure");
      expect(client.rawQuery).not.toHaveBeenCalled();
    } finally {
      setConfig({ db: { dialect: original } });
    }
  },
);

test.each(["mysql", "postgres"] as const)(
  "parameterized writes keep ID/default/undefined/null behavior and never use rawCommand (%s)",
  async (dialect) => {
    const { client: legacy } = fixture();
    const client = {
      ...legacy,
      sql: createSqlGenerator(dialect),
      supportsParameterizedStatements: true,
      executeCommand: jest
        .fn()
        .mockResolvedValue({ insertId: 7, affectedRows: 1, changedRows: 1 }),
    };
    const users = new Users(client);
    await expect(users.create({ name: "O'Reilly" })).resolves.toEqual({
      id: 7,
      active: true,
      name: "O'Reilly",
    });
    expect(client.executeCommand.mock.calls[0][0].values).toEqual([
      true,
      "O'Reilly",
    ]);
    await users.createBulk([
      { name: "one" },
      { name: "two", active: undefined } as never,
    ]);
    expect(client.executeCommand.mock.calls[1][0].values).toEqual([
      true,
      "one",
      "two",
    ]);
    expect(client.executeCommand.mock.calls[1][0].text).toContain("DEFAULT");
    await users.upsert({ name: "upsert" }, ["name"]);
    expect(client.executeCommand.mock.calls[2][0].text).toContain(
      dialect === "mysql" ? "ON DUPLICATE KEY UPDATE" : "ON CONFLICT",
    );
    await users.update({ id: 0, name: undefined });
    expect(client.executeCommand.mock.calls[3][0].values).toEqual([0, 0]);
    await users.updateWhere(
      { name: null as never },
      q.eq(q.field("users", "user_id"), q.value(7)),
    );
    expect(client.executeCommand.mock.calls[4][0].values).toEqual([null, 7]);
    await users.delete({ id: 0 });
    expect(client.executeCommand.mock.calls[5][0].values).toEqual([0]);
    const calls = client.executeCommand.mock.calls.length;
    await expect(users.createBulk([])).resolves.toBeNull();
    expect(client.executeCommand).toHaveBeenCalledTimes(calls);
    expect(client.rawCommand).not.toHaveBeenCalled();
  },
);
