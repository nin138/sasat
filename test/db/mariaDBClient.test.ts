import { MariaDBClient } from '../../src/db/mariaDBClient';
import { SQLClient } from '../../src/db/dbClient';

const client = new MariaDBClient({ host: '', port: 3306, user: 'test', database: 'test' });
test('mysql DBClient', () => {
  expect(client.formatQuery`select ${'a'},${'b'} from test`).toBe("select 'a','b' from test");
  expect(client.formatQuery`select ${() => 'a'},${() => 'b'} from test`).toBe('select a,b from test');
  expect(client.formatQuery`select ${['a', 'b', 'c']} from test`).toBe("select 'a', 'b', 'c' from test");

  expect(SQLClient.escape('a')).toBe("'a'");
  expect(SQLClient.escape("'b'")).toBe("'\\'b\\''");
  expect(SQLClient.escape(1)).toBe('1');
  expect(SQLClient.escape(true)).toBe('true');
});
