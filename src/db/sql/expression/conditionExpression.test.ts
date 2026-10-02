import { comparisonExpressionToSql } from "./comparison.js";
import { CompositeCondition } from "./compositeCondition.js";
import { conditionExpressionToSql } from "./conditionExpression.js";

test.each([
  "=",
  ">",
  "<",
  ">=",
  "<=",
  "<>",
  "LIKE",
  "NOT LIKE",
])("supports %s comparisons", (operator) => {
  expect(comparisonExpressionToSql({ name: [operator, "Ada"] } as never)).toBe(
    "`name` " + operator + " 'Ada'",
  );
});

test("joins only actual columns using the requested boolean operator", () => {
  expect(
    comparisonExpressionToSql({ __type: "OR", id: 1, name: "Ada" } as never),
  ).toBe("`id` = 1 OR `name` = 'Ada'");
});

test("renders IN, BETWEEN and NULL predicates", () => {
  expect(comparisonExpressionToSql({ id: ["IN", 1, 2] } as never)).toBe(
    "`id` IN (1, 2)",
  );
  expect(comparisonExpressionToSql({ age: ["BETWEEN", 18, 65] } as never)).toBe(
    "`age` BETWEEN 18 AND 65",
  );
  expect(comparisonExpressionToSql({ name: ["IS NULL"] } as never)).toBe(
    "`name` IS NULL",
  );
  expect(comparisonExpressionToSql({ name: ["IS NOT NULL"] } as never)).toBe(
    "`name` IS NOT NULL",
  );
  expect(() =>
    comparisonExpressionToSql({ id: ["INVALID", 1] } as never),
  ).toThrow("SQL PARSE ERROR");
});

test("groups nested AND/OR expressions with valid token boundaries", () => {
  const condition = CompositeCondition.or([{ id: 1 }, { id: 2 }]);
  expect(conditionExpressionToSql(condition)).toBe("(`id` = 1 OR `id` = 2)");
  expect(conditionExpressionToSql([{ active: true }, condition] as never)).toBe(
    "(`active` = true AND (`id` = 1 OR `id` = 2))",
  );
});
