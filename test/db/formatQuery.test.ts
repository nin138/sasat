import { formatQuery } from '../../src/db/formatQuery';
import * as SQLString from 'sqlstring';
import { whereToSQL } from '../../src/sql/condition';
// @ts-ignore
import { User } from '../out/__generated__/entity/User';

test('mysql DBClient', () => {
  expect(formatQuery`select ${'a'},${'b'} from test`).toBe(
    "select 'a','b' from test",
  );
  expect(formatQuery`select ${() => 'a'},${() => 'b'} from test`).toBe(
    'select a,b from test',
  );
  expect(formatQuery`select ${['a', 'b', 'c']} from test`).toBe(
    "select 'a', 'b', 'c' from test",
  );

  expect(SQLString.escape('a')).toBe("'a'");
  expect(SQLString.escape("'b'")).toBe("'\\'b\\''");
  expect(SQLString.escape(1)).toBe('1');
  expect(SQLString.escape(true)).toBe('true');
});

test('where to sql', () => {
  expect(
    whereToSQL<User>({
      name: ['IN', '1', '2'],
      nickName: 'a',
      createdAt: ['IS NULL'],
    }),
  ).toBe("`name` IN ('1', '2') AND nickName = 'a' AND `createdAt` IS NULL");
});
