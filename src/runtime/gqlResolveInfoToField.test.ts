import {
  buildSchema,
  execute,
  graphql,
  type OperationDefinitionNode,
  parse,
} from "graphql";
import {
  gqlResolveInfoToField,
  selectionSetToField,
} from "./gqlResolveInfoToField.js";

test("extracts nested selections, ignores typename, and uses field names rather than aliases", async () => {
  const schema = buildSchema(`
    type Query { user: User }
    type User { id: ID!, posts: [Post!]!, friend: User }
    type Post { id: ID!, title: String!, author: User }
  `);
  let selected: unknown;
  const result = await graphql({
    schema,
    source:
      "{ user { identifier: id __typename posts { title author { id } } friend { id } } }",
    rootValue: {
      user: (
        _args: unknown,
        _context: unknown,
        info: Parameters<typeof gqlResolveInfoToField>[0],
      ) => {
        selected = gqlResolveInfoToField(info);
        return null;
      },
    },
  });
  expect(result.errors).toBeUndefined();
  expect(selected).toEqual({
    fields: ["id"],
    tableAlias: "t0",
    relations: {
      posts: {
        fields: ["title"],
        tableAlias: "t1",
        relations: {
          author: { fields: ["id"], tableAlias: "t2", relations: {} },
        },
      },
      friend: { fields: ["id"], tableAlias: "t3", relations: {} },
    },
  });
});

const fragmentSchema = buildSchema(`
  interface Node { id: ID! }
  type Query { user: User, nodes: [Node!]!, results: [Result!]! }
  union Result = User | Admin
  type User implements Node { id: ID!, name: String!, posts: [Post!]!, friend: User }
  type Post { id: ID!, title: String!, author: User }
  type Admin implements Node { id: ID!, secret: String! }
`);

async function selections(
  source: string,
  variableValues?: Record<string, unknown>,
) {
  let selected: unknown;
  const resolve = (
    _args: unknown,
    _context: unknown,
    info: Parameters<typeof gqlResolveInfoToField>[0],
  ) => {
    selected = gqlResolveInfoToField(info);
    return info.fieldName === "user" ? null : [];
  };
  const result = await graphql({
    schema: fragmentSchema,
    source,
    variableValues,
    rootValue: { user: resolve, nodes: resolve, results: resolve },
  });
  expect(result.errors).toBeUndefined();
  return selected;
}

test("expands named, inline, and nested fragments without duplicate columns", async () => {
  expect(
    await selections(`
    { user { ...UserFields ... on User { name } } }
    fragment UserFields on User { identifier: id ...Details posts { ...PostFields } }
    fragment Details on User { name ... { __typename } }
    fragment PostFields on Post { title author { ...Details } }
  `),
  ).toEqual({
    fields: ["id", "name"],
    tableAlias: "t0",
    relations: {
      posts: {
        fields: ["title"],
        tableAlias: "t1",
        relations: {
          author: { fields: ["name"], tableAlias: "t2", relations: {} },
        },
      },
    },
  });
});

test("merges all fieldNodes and repeated relations, including aliases, before assigning aliases", async () => {
  expect(
    await selections(`{
    user { id posts { title } friend { id } }
    user { name first: posts { id author { id } } friend { name } }
    user { second: posts { author { name } } }
  }`),
  ).toEqual({
    fields: ["id", "name"],
    tableAlias: "t0",
    relations: {
      posts: {
        fields: ["title", "id"],
        tableAlias: "t1",
        relations: {
          author: { fields: ["id", "name"], tableAlias: "t2", relations: {} },
        },
      },
      friend: { fields: ["id", "name"], tableAlias: "t3", relations: {} },
    },
  });
});

test("evaluates skip/include on fields, spreads, and inline fragments with variable defaults", async () => {
  expect(
    await selections(`
    query($omit: Boolean! = true, $include: Boolean! = false) {
      user {
        id name @skip(if: $omit)
        ...Hidden @include(if: $include)
        ... on User @skip(if: $omit) { friend { id } }
        posts @include(if: true) { title id @skip(if: true) }
        ...Visible @skip(if: true)
        ...Visible @include(if: true)
      }
    }
    fragment Hidden on User { friend { name } }
    fragment Visible on User { name }
  `),
  ).toEqual({
    fields: ["id", "name"],
    tableAlias: "t0",
    relations: {
      posts: { fields: ["title"], tableAlias: "t1", relations: {} },
    },
  });
});

test("uses supplied directive variables on repeated relations", async () => {
  expect(
    await selections(
      `query($show: Boolean!) { user { posts @include(if: $show) { id } posts @skip(if: $show) { title } } }`,
      { show: false },
    ),
  ).toEqual({
    fields: [],
    tableAlias: "t0",
    relations: {
      posts: { fields: ["title"], tableAlias: "t1", relations: {} },
    },
  });
});

test("applies abstract type conditions without widening a concrete parent type", async () => {
  expect(
    await selections(`
    { user { ...NodeFields } }
    fragment NodeFields on Node { id ... on User { name } ... on Admin { secret } }
  `),
  ).toEqual({ fields: ["id", "name"], tableAlias: "t0", relations: {} });
});

test("narrows nested conditions when collecting possible abstract result types", async () => {
  expect(
    await selections(`{
    nodes { id ... on User { ... on Node { ... on User { name } ... on Admin { secret } } } }
  }`),
  ).toEqual({ fields: ["id", "name"], tableAlias: "t0", relations: {} });
});

test("collects a shared fragment separately for each relation", async () => {
  expect(
    await selections(`
    { user { ...Basic friend { ...Basic } posts { author { ...Basic } } } }
    fragment Basic on User { id name }
  `),
  ).toEqual({
    fields: ["id", "name"],
    tableAlias: "t0",
    relations: {
      friend: { fields: ["id", "name"], tableAlias: "t1", relations: {} },
      posts: {
        fields: [],
        tableAlias: "t2",
        relations: {
          author: { fields: ["id", "name"], tableAlias: "t3", relations: {} },
        },
      },
    },
  });
});

test("preserves the standalone helper's alias start and returned final index", () => {
  const operation = parse(
    "{ posts { id } posts { title author { id } } friend { id } }",
  ).definitions[0] as OperationDefinitionNode;
  expect(selectionSetToField(operation.selectionSet.selections, 5)).toEqual([
    {
      fields: [],
      tableAlias: "t5",
      relations: {
        posts: {
          fields: ["id", "title"],
          tableAlias: "t6",
          relations: {
            author: { fields: ["id"], tableAlias: "t7", relations: {} },
          },
        },
        friend: { fields: ["id"], tableAlias: "t8", relations: {} },
      },
    },
    8,
  ]);
});

test("stops cyclic and ignores missing fragments when validation is bypassed", async () => {
  let selected: unknown;
  const result = await execute({
    schema: fragmentSchema,
    document: parse(
      "{ user { ...Loop ...Missing } } fragment Loop on User { id friend { ...Loop } }",
    ),
    rootValue: {
      user: (
        _args: unknown,
        _context: unknown,
        info: Parameters<typeof gqlResolveInfoToField>[0],
      ) => {
        selected = gqlResolveInfoToField(info);
        return null;
      },
    },
  });
  expect(result.errors).toBeUndefined();
  expect(selected).toEqual({
    fields: ["id"],
    tableAlias: "t0",
    relations: { friend: { fields: [], tableAlias: "t1", relations: {} } },
  });
});

test("supports an empty effective selection", async () => {
  expect(
    await selections("{ user { __typename name @skip(if: true) } }"),
  ).toEqual({ fields: [], relations: {}, tableAlias: "t0" });
});

test("revisits a shared fragment for distinct possible union types", async () => {
  expect(
    await selections(`
    { results { ... on User { ...Shared } ... on Admin { ...Shared } } }
    fragment Shared on Node { id ... on User { name } ... on Admin { secret } }
  `),
  ).toEqual({
    fields: ["id", "name", "secret"],
    tableAlias: "t0",
    relations: {},
  });
});
