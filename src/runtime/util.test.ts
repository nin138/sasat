import { nonNullable, pick, unique } from "./util.js";

test("picks requested properties without changing the source", () => {
  const source = { id: 1, name: "Ada", hidden: true };
  expect(pick(source, ["id", "name"])).toEqual({ id: 1, name: "Ada" });
  expect(pick(source, [])).toEqual({});
  expect(source.hidden).toBe(true);
});

test("keeps falsy non-null values", () => {
  expect([null, undefined, 0, false, "", 1].filter(nonNullable)).toEqual([
    0,
    false,
    "",
    1,
  ]);
});

test("deduplicates values in insertion order", () => {
  const object = {};
  expect(unique([NaN, NaN, 0, 0])).toEqual([NaN, 0]);
  expect(unique([object, object])).toEqual([object]);
  expect(unique([])).toEqual([]);
});
