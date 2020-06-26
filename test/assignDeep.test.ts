import { assignDeep } from '../src/util/assignDeep';

describe('assignDeep', () => {
  it('should ', function () {
    expect(assignDeep({}, { a: 1 })).toStrictEqual({ a: 1 });
    expect(assignDeep({ a: { b: 1 } }, { a: { c: 2, d: 3 } })).toStrictEqual({ a: { b: 1, c: 2, d: 3 } });
    expect(assignDeep({}, { a: { b: 2, c: 3 } }, { a: { d: 4, f: 6 } })).toStrictEqual({
      a: { b: 2, c: 3, d: 4, f: 6 },
    });
    expect(assignDeep({}, { a: { b: 2 } }, { a: 1 })).toStrictEqual({ a: 1 });
    expect(assignDeep({}, { a: [1] }, { a: [2] })).toStrictEqual({ a: [1, 2] });
  });
});
