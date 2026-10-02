import { buildSchema } from "graphql";
import { createTypeDef } from "./createTypeDef.js";

test("generates valid GraphQL types, arguments, and inputs", () => {
  const sdl = createTypeDef(
    {
      Query: { user: { return: "User", args: [{ name: "id", type: "ID!" }] } },
      User: { id: { return: "ID!" }, names: { return: "[String!]!" } },
      Empty: {},
    },
    { UserInput: { name: { return: "String!" } } },
  );
  expect(sdl).toContain("user(id: ID!): User");
  expect(sdl).toContain("input UserInput");
  expect(sdl).not.toContain("Empty");
  expect(() => buildSchema(sdl)).not.toThrow();
});

test("omits parentheses for empty arguments", () => {
  expect(
    createTypeDef({ Query: { count: { return: "Int", args: [] } } }, {}),
  ).toContain("count: Int");
});

test("identifies a field with no return type", () => {
  expect(() =>
    createTypeDef({ Query: { broken: { return: "" } } }, {}),
  ).toThrow("Return type required: Query.broken");
  expect(createTypeDef({}, {})).toBe("");
});
