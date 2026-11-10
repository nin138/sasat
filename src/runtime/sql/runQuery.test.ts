import { QExpr as q } from "../dsl/factory.js";
import {
  createQueryResolveInfo,
  type RelationMap,
  type TableInfo,
} from "../dsl/query/createQueryResolveInfo.js";
import { queryToSql } from "../dsl/query/sql/queryToSql.js";
import type { Fields } from "../field.js";
import {
  createPagingFieldQuery,
  createPagingInnerQuery,
  createQuery,
  runQuery,
} from "./runQuery.js";

const tables: TableInfo = {
  users: {
    identifiableKeys: ["user_id"],
    identifiableFields: ["id"],
    columnMap: { id: "user_id", name: "name" },
  },
  posts: {
    identifiableKeys: ["id"],
    identifiableFields: ["id"],
    columnMap: { id: "id", title: "title" },
  },
};
const relations: RelationMap = {
  users: {
    posts: {
      table: "posts",
      array: true,
      nullable: true,
      requiredColumns: ["user_id"],
      condition: ({ parentTableAlias, childTableAlias }) =>
        q.eq(
          q.field(parentTableAlias!, "user_id"),
          q.field(childTableAlias, "user_id"),
        ),
    },
  },
  posts: {},
};

test.each([undefined, null, false])(
  "disabled relations %s do not create joins or require source columns",
  (disabled) => {
    const fields = { fields: ["name"], relations: { posts: disabled } };
    const query = createQuery("users", fields, undefined, tables, relations);
    expect(query.from.joins).toEqual([]);
    expect(query.select).toHaveLength(2);
    expect(
      createQueryResolveInfo(
        "users",
        fields as unknown as Fields<unknown>,
        relations,
        tables,
      ).joins,
    ).toEqual([]);
    const paging = createPagingFieldQuery({
      baseTableName: "users",
      fields: fields as unknown as Fields<unknown>,
      tableInfo: tables,
      relationMap: relations,
      pagingOption: { numberOfItem: 1 },
    });
    expect(paging.from.joins).toEqual([]);
  },
);

test.each(["t0", "t1", "t2"])(
  "automatic table aliases do not collide with an explicit root alias %s",
  (tableAlias) => {
    const fields = {
      fields: ["id"],
      tableAlias,
      relations: { posts: { fields: ["id"] } },
    };
    const query = createQuery("users", fields, undefined, tables, relations);
    const child = query.from.joins[0].table.alias;
    expect(child).not.toBe(tableAlias);
    expect(
      query.select.map((field) => ("table" in field ? field.table : undefined)),
    ).toEqual([tableAlias, child]);
    expect(
      createQueryResolveInfo(
        "users",
        fields as unknown as Fields<unknown>,
        relations,
        tables,
      ).joins[0].tableAlias,
    ).toBe(child);
  },
);
test("reserves explicit descendant aliases before choosing automatic parent aliases", () => {
  const fields = {
    fields: ["id"],
    relations: { posts: { fields: ["id"], tableAlias: "t0" } },
  };
  const query = createQuery("users", fields, undefined, tables, relations);
  expect(query.from.alias).not.toBe("t0");
  expect(query.from.joins[0].table.alias).toBe("t0");
});
test("rejects duplicate explicit aliases before producing ambiguous SQL", () => {
  const fields = {
    fields: ["id"],
    tableAlias: "same",
    relations: { posts: { fields: ["id"], tableAlias: "same" } },
  };
  expect(() =>
    createQuery("users", fields, undefined, tables, relations),
  ).toThrow("Duplicate table alias");
});

test("paging shares the resolved root alias with its inner query", () => {
  const fields = {
    fields: ["id"],
    relations: { posts: { fields: ["id"], tableAlias: "t0" } },
  };
  const query = createPagingFieldQuery({
    baseTableName: "users",
    fields: fields as unknown as Fields<unknown>,
    tableInfo: tables,
    relationMap: relations,
    pagingOption: { numberOfItem: 1 },
  });
  expect(query.from.subquery).toBe(true);
  if (!query.from.subquery) throw new Error("expected a paging subquery");
  expect(query.from.alias).not.toBe("t0");
  expect(query.from.query.from.alias).toBe(query.from.alias);
  expect(query.from.joins[0].table.alias).toBe("t0");
});
test("automatic aliases also avoid explicitly joined tables", () => {
  const join = q.join(q.table("posts", [], "t1"), q.eq(q.value(1), q.value(1)));
  const query = createQuery(
    "users",
    { fields: ["id"], relations: { posts: { fields: ["id"] } } },
    { join: [join] },
    tables,
    relations,
  );
  expect(query.from.alias).toBe("t0");
  expect(query.from.joins[0].table.alias).toBe("t2");
});

test("paging aliases also avoid joins supplied only in paging options", () => {
  const join = q.join(q.table("posts", [], "t0"), q.eq(q.value(1), q.value(1)));
  const query = createPagingFieldQuery({
    baseTableName: "users",
    fields: { fields: ["id"] as never[] },
    tableInfo: tables,
    relationMap: relations,
    pagingOption: { numberOfItem: 1, join: [join] },
  });
  if (!query.from.subquery) throw new Error("expected a paging subquery");
  expect(query.from.alias).not.toBe("t0");
  expect(query.from.query.from.alias).toBe(query.from.alias);
  expect(query.from.query.from.joins[0].table.alias).toBe("t0");
});

test("selects identity columns and ignores GraphQL-only fields", () => {
  const fields = {
    fields: ["name", "name", "__typename", "unknown"],
    relations: { posts: { fields: ["title"] } },
  };
  const query = createQuery("users", fields, undefined, tables, relations);
  expect(query.select).toEqual([
    q.field("t0", "name", "t0__name"),
    q.field("t0", "user_id", "t0__id"),
    q.field("t1", "title", "t1__title"),
    q.field("t1", "id", "t1__id"),
  ]);
  expect(query.from.joins[0].type).toBe("LEFT");
  expect(
    createQueryResolveInfo(
      "users",
      fields as unknown as Fields<unknown>,
      relations,
      tables,
    ),
  ).toEqual({
    tableAlias: "t0",
    isArray: true,
    property: "",
    keyAliases: ["id"],
    joins: [
      {
        tableAlias: "t1",
        isArray: true,
        property: "posts",
        keyAliases: ["id"],
        joins: [],
      },
    ],
  });
});

test("respects explicit aliases, join types and extra predicates", () => {
  const fields = {
    fields: ["id"],
    tableAlias: "u",
    relations: {
      posts: {
        fields: ["id"],
        tableAlias: "p",
        joinType: "INNER" as const,
        joinOn: q.raw("p.active = 1"),
      },
    },
  };
  const query = createQuery("users", fields, { limit: 5 }, tables, relations);
  expect(query.limit).toBe(5);
  expect(query.from.alias).toBe("u");
  expect(query.from.joins[0]).toMatchObject({
    type: "INNER",
    table: { alias: "p" },
  });
});

test("adds required join columns to the paging subquery only once", () => {
  const query = createPagingInnerQuery(
    "users",
    "u",
    {
      fields: ["name"] as never[],
      relations: { posts: { fields: [] } },
    },
    { numberOfItem: 5, offset: 10 },
    tables,
    relations,
  );
  expect(query.select).toEqual([q.field("u", "user_id"), q.field("u", "name")]);
  expect(query).toMatchObject({ limit: 5, offset: 10 });
});

test("runs SQL and hydrates the returned rows", async () => {
  const client = {
    rawQuery: jest.fn().mockResolvedValue([{ u__id: 1 }]),
    rawCommand: jest.fn(),
  };
  const result = await runQuery(
    client,
    { select: [q.field("u", "id", "u__id")], from: q.table("users", [], "u") },
    {
      tableAlias: "u",
      property: "",
      isArray: true,
      keyAliases: ["id"],
      joins: [],
    },
  );
  expect(result).toEqual([{ id: 1 }]);
  expect(client.rawQuery).toHaveBeenCalledWith(
    "SELECT `u`.`id` AS `u__id` FROM `users` AS `u`",
  );
});

test("combines paging and query predicates before limiting parents", () => {
  const query = createPagingFieldQuery({
    baseTableName: "users",
    fields: {
      fields: ["id"] as never[],
      relations: { posts: { fields: ["title"] } },
    },
    tableInfo: tables,
    relationMap: relations,
    pagingOption: {
      numberOfItem: 2,
      offset: 1,
      where: q.or(
        q.eq(q.field("t0", "name"), q.value("Ada")),
        q.eq(q.field("t0", "name"), q.value("Lin")),
      ),
    },
    queryOption: { where: q.gt(q.field("t0", "user_id"), q.value(10)) },
  });
  const sql = queryToSql(query).replace(/\s+/g, " ");
  expect(sql).toContain(
    "WHERE `t0`.`user_id` > 10 AND (`t0`.`name` = 'Ada' OR `t0`.`name` = 'Lin') LIMIT 2 OFFSET 1",
  );
  expect(sql.indexOf("LIMIT 2")).toBeLessThan(sql.indexOf("LEFT JOIN"));
});

test("applies query-only conditions with their joins, ordering and locks inside the page", () => {
  const joined = q.join(
    q.table("posts", [], "p"),
    q.eq(q.field("u", "user_id"), q.field("p", "user_id")),
    "INNER",
  );
  const query = createPagingFieldQuery({
    baseTableName: "users",
    fields: { fields: ["id"] as never[], tableAlias: "u" },
    tableInfo: tables,
    relationMap: relations,
    pagingOption: { numberOfItem: 3, join: [joined] },
    queryOption: {
      join: [joined],
      where: q.eq(q.field("p", "title"), q.value("allowed")),
      sort: [q.sort(q.field("u", "user_id"), "DESC")],
      lock: "FOR UPDATE",
    },
  });
  const sql = queryToSql(query).replace(/\s+/g, " ");
  expect(sql).toContain(
    "WHERE `p`.`title` = 'allowed' ORDER BY `u`.`user_id` DESC LIMIT 3 FOR UPDATE) AS `u`",
  );
  expect(sql.match(/INNER JOIN/g)).toHaveLength(1);
  expect(query.lock).toBe("FOR UPDATE");
});

test("runQuery uses the opted-in binding API and hydrates its result", async () => {
  const client = {
    supportsParameterizedStatements: true,
    rawQuery: jest.fn(),
    rawCommand: jest.fn(),
    executeQuery: jest.fn().mockResolvedValue([{ u__id: 1 }]),
  };
  const rows = await runQuery(
    client,
    {
      select: [q.field("u", "id", "u__id")],
      from: q.table("users", [], "u"),
      where: q.eq(q.field("u", "id"), q.value(1)),
    },
    {
      tableAlias: "u",
      property: "",
      isArray: true,
      keyAliases: ["id"],
      joins: [],
    },
  );
  expect(rows).toEqual([{ id: 1 }]);
  expect(client.executeQuery).toHaveBeenCalledWith({
    text: expect.stringContaining("WHERE `u`.`id`  = CAST(? AS SIGNED)"),
    values: [1],
  });
  expect(client.rawQuery).not.toHaveBeenCalled();
});
