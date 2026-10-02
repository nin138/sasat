import { QExpr as q } from "../dsl/factory.js";
import {
  createQueryResolveInfo,
  type RelationMap,
  type TableInfo,
} from "../dsl/query/createQueryResolveInfo.js";
import type { Fields } from "../field.js";
import { createPagingInnerQuery, createQuery, runQuery } from "./runQuery.js";

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
