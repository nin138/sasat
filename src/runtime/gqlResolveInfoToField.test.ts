import { buildSchema, graphql } from "graphql";
import { gqlResolveInfoToField } from "./gqlResolveInfoToField.js";

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
