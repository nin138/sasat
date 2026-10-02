import { arrayEq, unique, uniqueDeep } from "./arrayUtil.js";

describe("array utilities", () => {
  test.each([
    [[], [], true],
    [[1, 2], [1, 2], true],
    [[1], [1, 2], false],
    [[1, 2], [2, 1], false],
    [[1], ["1"], false],
  ])("compares ordered arrays %j and %j", (left, right, expected) => {
    expect(arrayEq(left, right)).toBe(expected);
  });
  test("uses identity for shallow comparisons and deduplication", () => {
    const object = { id: 1 };
    expect(arrayEq([object], [object])).toBe(true);
    expect(arrayEq([object], [{ id: 1 }])).toBe(false);
    expect(unique([object, object, { id: 1 }])).toHaveLength(2);
    expect(unique([2, 1, 2, 3, 1])).toEqual([2, 1, 3]);
  });
  test("deduplicates nested JSON values without mutating the input", () => {
    const values = [{ id: 1, tags: ["a"] }, { id: 1, tags: ["a"] }, { id: 2 }];
    expect(uniqueDeep(values)).toEqual([values[0], values[2]]);
    expect(values).toHaveLength(3);
    expect(uniqueDeep([])).toEqual([]);
  });
});
