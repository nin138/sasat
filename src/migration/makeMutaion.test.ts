import { Mutations } from "./makeMutaion.js";
import { Queries } from "./makeQuery.js";

test.each([
  "create",
  "update",
  "delete",
] as const)("sets safe defaults for %s mutations", (method) => {
  expect(Mutations[method]()).toEqual({
    type: method,
    noReFetch: false,
    middlewares: [],
    contextFields: [],
    subscription: { enabled: false, subscriptionFilter: [] },
  });
});

test.each([
  [true, { enabled: true, subscriptionFilter: [] }],
  [false, { enabled: false, subscriptionFilter: [] }],
  [
    { enabled: true, subscriptionFilter: ["id"] },
    { enabled: true, subscriptionFilter: ["id"] },
  ],
])("normalizes subscription configuration %j", (subscription, expected) => {
  expect(Mutations.create({ subscription }).subscription).toEqual(expected);
});

test("preserves middleware and no-refetch options", () => {
  expect(
    Mutations.update({ noRefetch: true, middlewares: ["auth"] }),
  ).toMatchObject({ noReFetch: true, middlewares: ["auth"] });
});

test.each([
  ["single", "single"],
  ["listAll", "list-all"],
  ["paging", "list-paging"],
] as const)("creates %s queries", (method, type) => {
  expect(Queries[method]("users", { middlewares: ["auth"] })).toEqual({
    type,
    name: "users",
    conditions: [],
    middlewares: ["auth"],
  });
});
