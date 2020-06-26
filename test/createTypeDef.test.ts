import { createTypeDef } from '../src';

describe('createTypeDef', () => {
  it('should ', function () {
    expect(createTypeDef({ T1: ['q1', 'q2'], T2: ['q3', 'q4'] })).toBe(`\
type T1 {
  q1
  q2
}

type T2 {
  q3
  q4
}
`);
  });
});
