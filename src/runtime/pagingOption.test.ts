import { QExpr } from "./dsl/factory.js";
import { pagingOption } from "./pagingOption.js";

test("uses no sort when no order is supplied", () => {
  expect(pagingOption({ numberOfItem: 10, offset: 0 })).toEqual({
    numberOfItem: 10,
    offset: 0,
    sort: [],
  });
});

test.each([
  [undefined, "ASC"],
  [true, "ASC"],
  [false, "DESC"],
] as const)("maps ascending option %s", (asc, direction) => {
  expect(
    pagingOption({ numberOfItem: 5, offset: 10, order: "name", asc }).sort,
  ).toEqual([QExpr.sort(QExpr.field("t1", "name"), direction)]);
});
