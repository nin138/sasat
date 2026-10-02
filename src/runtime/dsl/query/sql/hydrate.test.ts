import { hydrate, type QueryResolveInfo } from "./hydrate.js";

const info = (): QueryResolveInfo => ({
  tableAlias: "u",
  isArray: true,
  property: "",
  keyAliases: ["id"],
  joins: [
    {
      tableAlias: "p",
      isArray: true,
      property: "posts",
      keyAliases: ["id"],
      joins: [
        {
          tableAlias: "c",
          isArray: true,
          property: "comments",
          keyAliases: ["id"],
          joins: [],
        },
      ],
    },
    {
      tableAlias: "profile",
      isArray: false,
      property: "profile",
      keyAliases: ["id"],
      joins: [],
    },
  ],
});

test("hydrates nested joins, deduplicating parents and children", () => {
  const rows = [
    { u__id: 1, u__name: "Ada", p__id: 10, c__id: 100, profile__id: 20 },
    { u__id: 1, u__name: "Ada", p__id: 10, c__id: 101, profile__id: 20 },
    { u__id: 1, u__name: "Ada", p__id: 11, c__id: null, profile__id: 20 },
    { u__id: 2, u__name: "Lin", p__id: null, c__id: null, profile__id: null },
  ];
  expect(hydrate(rows, info())).toEqual([
    {
      id: 1,
      name: "Ada",
      posts: [
        { id: 10, comments: [{ id: 100 }, { id: 101 }] },
        { id: 11, comments: [] },
      ],
      profile: { id: 20 },
    },
    { id: 2, name: "Lin", posts: [], profile: null },
  ]);
  expect(rows[0]).toEqual({
    u__id: 1,
    u__name: "Ada",
    p__id: 10,
    c__id: 100,
    profile__id: 20,
  });
});

test("handles empty result sets", () => {
  expect(hydrate([], info())).toEqual([]);
});

test("distinguishes composite keys and accepts zero-valued IDs", () => {
  const metadata = {
    tableAlias: "t",
    isArray: true,
    property: "",
    keyAliases: ["tenant", "id"],
    joins: [],
  };
  expect(
    hydrate(
      [
        { t__tenant: 1, t__id: 0 },
        { t__tenant: 2, t__id: 0 },
        { t__tenant: 1, t__id: 0 },
      ],
      metadata,
    ),
  ).toEqual([
    { tenant: 1, id: 0 },
    { tenant: 2, id: 0 },
  ]);
});
