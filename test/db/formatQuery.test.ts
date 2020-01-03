import { formatQuery } from '../../src/db/formatQuery';
import * as SQLString from 'sqlstring';
import { whereToSQL } from '../../src/sql/condition';
import { User } from '../out/__generated__/entity/user';

test('mysql DBClient', () => {
  expect(formatQuery`select ${'a'},${'b'} from test`).toBe("select 'a','b' from test");
  expect(formatQuery`select ${() => 'a'},${() => 'b'} from test`).toBe('select a,b from test');
  expect(formatQuery`select ${['a', 'b', 'c']} from test`).toBe("select 'a', 'b', 'c' from test");

  expect(SQLString.escape('a')).toBe("'a'");
  expect(SQLString.escape("'b'")).toBe("'\\'b\\''");
  expect(SQLString.escape(1)).toBe('1');
  expect(SQLString.escape(true)).toBe('true');
});

test('where to sql', () => {
  expect(
    whereToSQL<User>({
      name: ['IN', '1', '2'],
      nick_name: 'a',
      created_at: ['IS NULL'],
    }),
  ).toBe("`name` IN ('1', '2') AND nick_name = 'a' AND `created_at` IS NULL");
});
