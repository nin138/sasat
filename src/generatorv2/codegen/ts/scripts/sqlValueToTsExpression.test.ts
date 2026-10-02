import { sqlValueToTsExpression } from "./sqlValueToTsExpression.js";

test.each([null, true, false, 0, 3.5, "Ada", "O'Reilly"])(
  "preserves SQL default %j in generated code",
  (value) => {
    const expression = sqlValueToTsExpression(value);
    expect(new Function("return " + expression.toString())()).toBe(value);
  },
);
