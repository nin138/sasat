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

const flatInfo = (keyAliases = ["id"]): QueryResolveInfo => ({
  tableAlias: "t",
  isArray: true,
  property: "",
  keyAliases,
  joins: [],
});

test("retains special string IDs and distinguishes scalar types", () => {
  const ids = [
    "__proto__",
    "constructor",
    "toString",
    "",
    0,
    "0",
    1,
    "1",
    false,
    "false",
  ];
  const rows = ids.map((id) => ({ t__id: id }));
  expect(hydrate([...rows, ...rows], flatInfo())).toEqual(
    ids.map((id) => ({ id })),
  );
});

test("keeps colliding composite keys and their children separate", () => {
  const metadata = flatInfo(["tenant", "id"]);
  metadata.joins = [
    {
      tableAlias: "c",
      isArray: true,
      property: "children",
      keyAliases: ["id"],
      joins: [],
    },
  ];
  expect(
    hydrate(
      [
        { t__tenant: "a_~_b", t__id: "c", c__id: 1 },
        { t__tenant: "a", t__id: "b_~_c", c__id: 2 },
        { t__tenant: "a_~_b", t__id: "c", c__id: 3 },
        { t__tenant: "a", t__id: "b_~_c", c__id: 2 },
      ],
      metadata,
    ),
  ).toEqual([
    { tenant: "a_~_b", id: "c", children: [{ id: 1 }, { id: 3 }] },
    { tenant: "a", id: "b_~_c", children: [{ id: 2 }] },
  ]);
});

test("preserves types and escaped characters in composite keys", () => {
  const keys = [
    [1, "x"],
    ["1", "x"],
    ["", "_~_"],
    ["_~_", ""],
    ['a", "b', "c\\d"],
    ["a", 'b", "c\\d'],
  ];
  const rows = keys.map(([tenant, id]) => ({ t__tenant: tenant, t__id: id }));
  expect(hydrate([...rows, ...rows], flatInfo(["tenant", "id"]))).toEqual(
    keys.map(([tenant, id]) => ({ tenant, id })),
  );
});

test("isolates child indexes by parent, relation, and hydrate invocation", () => {
  const metadata = flatInfo();
  metadata.joins = [
    {
      tableAlias: "c",
      isArray: true,
      property: "children",
      keyAliases: ["tenant", "id"],
      joins: [
        {
          tableAlias: "g",
          isArray: true,
          property: "grandchildren",
          keyAliases: ["id"],
          joins: [],
        },
      ],
    },
    {
      tableAlias: "s",
      isArray: true,
      property: "siblings",
      keyAliases: ["id"],
      joins: [],
    },
  ];
  const rows = [
    { t__id: 1, c__tenant: "a_~_b", c__id: "c", g__id: "__proto__", s__id: 0 },
    {
      t__id: 2,
      c__tenant: "a_~_b",
      c__id: "c",
      g__id: "constructor",
      s__id: 0,
    },
    { t__id: 1, c__tenant: "a", c__id: "b_~_c", g__id: "", s__id: 0 },
    {
      t__id: 1,
      c__tenant: "a_~_b",
      c__id: "c",
      g__id: "constructor",
      s__id: "0",
    },
    { t__id: 3, c__tenant: null, c__id: null, g__id: null, s__id: null },
  ];
  const expected = [
    {
      id: 1,
      children: [
        {
          tenant: "a_~_b",
          id: "c",
          grandchildren: [{ id: "__proto__" }, { id: "constructor" }],
        },
        { tenant: "a", id: "b_~_c", grandchildren: [{ id: "" }] },
      ],
      siblings: [{ id: 0 }, { id: "0" }],
    },
    {
      id: 2,
      children: [
        { tenant: "a_~_b", id: "c", grandchildren: [{ id: "constructor" }] },
      ],
      siblings: [{ id: 0 }],
    },
    { id: 3, children: [], siblings: [] },
  ];
  expect(hydrate([...rows, ...rows], metadata)).toEqual(expected);
  expect(hydrate(rows, metadata)).toEqual(expected);
});

test("deduplicates bigint composite keys without colliding with string keys", () => {
  const metadata = flatInfo(["tenant", "id"]);
  expect(
    hydrate(
      [
        { t__tenant: 1n, t__id: 9007199254740992n },
        { t__tenant: 1n, t__id: 9007199254740993n },
        { t__tenant: 1n, t__id: 9007199254740993n },
        { t__tenant: "1", t__id: "9007199254740993" },
      ],
      metadata,
    ),
  ).toEqual([
    { tenant: 1n, id: 9007199254740992n },
    { tenant: 1n, id: 9007199254740993n },
    { tenant: "1", id: "9007199254740993" },
  ]);
});
