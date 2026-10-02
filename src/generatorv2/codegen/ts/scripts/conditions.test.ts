import { Conditions as c } from "../../../../migration/makeCondition.js";
import { QExpr } from "../../../../runtime/dsl/factory.js";
import { makeThrowExpressions } from "../relationMap/makeNoContexError.js";
import {
  makeConditionValueQExpr,
  makeConditionValueRaw,
} from "./makeConditonValueExpr.js";

test.each([
  [c.value.fixed(7), 7],
  [c.value.fixed("Ada"), "Ada"],
  [c.value.contextOrDefault("tenant", 9), 3],
  [c.value.contextOrError("tenant", "tenant required"), 3],
])("generates executable values for %j", (value, expected) => {
  const arg = { context: { tenant: 3 } };
  expect(
    new Function("arg", "return " + makeConditionValueRaw(value).toString())(
      arg,
    ),
  ).toBe(expected);
  expect(
    new Function(
      "arg",
      "qe",
      "return " + makeConditionValueQExpr(value).toString(),
    )(arg, QExpr),
  ).toEqual(QExpr.value(expected));
});

test("falls back only when a context value is missing", () => {
  const code = makeConditionValueQExpr(
    c.value.contextOrDefault("tenant", 9),
  ).toString();
  const evaluate = new Function("arg", "qe", "return " + code);
  expect(evaluate({}, QExpr)).toEqual(QExpr.value(9));
  expect(evaluate({ context: { tenant: 0 } }, QExpr)).toEqual(QExpr.value(0));
  const raw = new Function(
    "arg",
    "return " +
      makeConditionValueRaw(c.value.contextOrDefault("name", "guest")),
  );
  expect(raw({ context: { name: "" } })).toBe("");
});

test("generates date, current-time, field and argument expressions", () => {
  expect(makeConditionValueQExpr(c.value.today(9, true)).toString()).toContain(
    "getTodayDateString",
  );
  expect(makeConditionValueRaw(c.value.today()).toString()).toContain(
    "getTodayDateTimeString",
  );
  expect(makeConditionValueRaw(c.value.now()).toString()).toBe(
    "dateString(new Date())",
  );
  expect(makeConditionValueQExpr(c.value.now()).toString()).toContain(
    "dateString(new Date())",
  );
  expect(makeConditionValueQExpr(c.value.field("id")).toString()).toBe(
    "qe.field('t0','id')",
  );
  expect(makeConditionValueQExpr(c.value.arg("id", "Int")).toString()).toBe(
    "qe.value(id)",
  );
});

test.each([
  c.rel.comparison(
    c.value.parent("id"),
    "=",
    c.value.contextOrError("tenant", "tenant required"),
  ),
  c.rel.in(c.value.parent("id"), [
    c.value.contextOrError("tenant", "tenant required"),
  ]),
  c.rel.between(
    c.value.child("id"),
    c.range.values(
      c.value.fixed(1),
      c.value.contextOrError("tenant", "tenant required"),
    ),
  ),
  c.rel.isNull(c.value.contextOrError("tenant", "tenant required")),
])("enforces required context in generated join guards", (condition) => {
  const guard = makeThrowExpressions(condition)
    .filter(Boolean)
    .map(String)
    .join("\n");
  const evaluate = new Function("arg", guard);
  expect(() => evaluate({})).toThrow("tenant required");
  expect(() => evaluate({ context: { tenant: 0 } })).not.toThrow();
});

test("does not add guards for fixed, defaulted, custom or date-range conditions", () => {
  const conditions = [
    c.custom("custom", ["id"], ["userId"]),
    c.rel.comparison(
      c.value.fixed(1),
      "=",
      c.value.contextOrDefault("tenant", 9),
    ),
    c.rel.between(c.value.child("createdAt"), c.range.today()),
  ];
  expect(conditions.flatMap(makeThrowExpressions).filter(Boolean)).toEqual([]);
});
