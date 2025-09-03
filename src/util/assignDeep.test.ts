import { assignDeep } from './assignDeep.js';

describe('assignDeep', () => {
  it('test', () => {
    expect(
      assignDeep(
        {
          a: 1,
          b: {
            c: {
              d: 1,
              e: 2,
            },
            c2: {
              a: 1,
            },
          },
        },
        {
          a: 2,
          b: {
            c: {
              d: 5,
            },
            c3: {
              a: 1,
            },
          },
        },
      ),
    ).toStrictEqual({
      a: 2,
      b: {
        c: {
          d: 5,
          e: 2,
        },
        c2: {
          a: 1,
        },
        c3: {
          a: 1,
        },
      },
    });
  });
});
