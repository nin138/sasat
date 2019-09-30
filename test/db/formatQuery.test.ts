import { SQLClient } from '../../src/db/dbClient';
import { formatQuery } from '../../src/db/formatQuery';

test('mysql DBClient', () => {
  expect(formatQuery`select ${'a'},${'b'} from test`).toBe("select 'a','b' from test");
  expect(formatQuery`select ${() => 'a'},${() => 'b'} from test`).toBe('select a,b from test');
  expect(formatQuery`select ${['a', 'b', 'c']} from test`).toBe("select 'a', 'b', 'c' from test");

  expect(SQLClient.escape('a')).toBe("'a'");
  expect(SQLClient.escape("'b'")).toBe("'\\'b\\''");
  expect(SQLClient.escape(1)).toBe('1');
  expect(SQLClient.escape(true)).toBe('true');
});
