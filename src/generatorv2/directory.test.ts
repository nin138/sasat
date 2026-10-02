import { makeGQLType } from "./codegen/ts/scripts/gqlString.js";
import { Directory } from "./directory.js";
import { EntityName } from "./nodes/entityName.js";

test.each([
  ["GENERATED", "ENTITIES", "./entities/User"],
  ["ENTITIES", "GENERATED", "../fields"],
  ["DATA_SOURCES", "GENERATED_DS", "../../__generated__/dataSources/db/User"],
] as const)("resolves imports from %s to %s", (from, to, expected) => {
  expect(
    Directory.resolve(
      from,
      to,
      expected.endsWith("fields") ? "fields" : "User",
    ),
  ).toBe(expected);
});

test("normalizes table names consistently across generated symbols", () => {
  const name = EntityName.fromTableName("user_profile");
  expect(name.toString()).toBe("UserProfile");
  expect(name.lowerCase()).toBe("userProfile");
  expect(name.dataSourceName()).toBe("UserProfileDBDataSource");
  expect(name.createInputName()).toBe("UserProfileCreateInput");
});

test.each([
  [false, false, "User!"],
  [true, false, "User"],
  [false, true, "[User!]!"],
  [true, true, "[User]!"],
])("renders GraphQL nullability=%s and array=%s", (nullable, array, expected) => {
  expect(makeGQLType("User", nullable, array)).toBe(expected);
});
