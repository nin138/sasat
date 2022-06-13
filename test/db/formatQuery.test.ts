import { formatQuery } from '../../src/db/formatQuery';
import * as SQLString from 'sqlstring';
// @ts-ignore
import { User } from '../out/__generated__/entity/User';

test('mysql DBClient', () => {
  expect(formatQuery`select ${'a'},${'b'} from test`).toBe("select 'a','b' from test");
  expect(formatQuery`select ${() => 'a'},${() => 'b'} from test`).toBe('select a,b from test');
  expect(formatQuery`select ${['a', 'b', 'c']} from test`).toBe("select 'a', 'b', 'c' from test");

  expect(SQLString.escape('a')).toBe("'a'");
  expect(SQLString.escape("'b'")).toBe("'\\'b\\''");
  expect(SQLString.escape(1)).toBe('1');
  expect(SQLString.escape(true)).toBe('true');
});
