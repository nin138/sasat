import { MariaDBClient } from "../../src/db/mariaDBClient";

const client = new MariaDBClient({ host: "", port: 3306, user: "test", database: "test" });
test("mysql DBClient", () => {
  expect(client.formatQuery`select ${"a"},${"b"} from test`).toBe("select 'a','b' from test");
  expect(client.formatQuery`select ${() => "a"},${() => "b"} from test`).toBe("select a,b from test");
  expect(client.formatQuery`select ${["a", "b", "c"]} from test`).toBe("select 'a', 'b', 'c' from test");

  expect(client.escape("a")).toBe("'a'");
  expect(client.escape("'b'")).toBe("'\\'b\\''");
  expect(client.escape(1)).toBe("1");
  expect(client.escape(true)).toBe("true");
});
