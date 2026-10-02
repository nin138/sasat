import { formatQuery } from "./formatQuery.js";

test("escapes hostile strings and primitive values", () => {
  expect(formatQuery`SELECT ${"x' OR 1=1 --"}, ${null}, ${false}, ${0}`).toBe(
    "SELECT 'x\\' OR 1=1 --', NULL, false, 0",
  );
});

test("supports lists and explicitly supplied SQL fragments", () => {
  expect(
    formatQuery`SELECT * FROM ${() => "`users`"} WHERE id IN (${[1, 2]})`,
  ).toBe("SELECT * FROM `users` WHERE id IN (1, 2)");
  expect(formatQuery`SELECT 1`).toBe("SELECT 1");
});
