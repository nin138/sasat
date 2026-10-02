import { createConnection } from "mysql2/promise";
import { TestDBClient } from "./testDBClient.js";

jest.mock("mysql2/promise", () => ({ createConnection: jest.fn() }));

test("creates and drops the requested disposable database", async () => {
  const connection = {
    query: jest.fn().mockResolvedValue([[], []]),
    end: jest.fn().mockResolvedValue(undefined),
  };
  jest.mocked(createConnection).mockResolvedValue(connection as never);
  const client = await TestDBClient.create({
    host: "test",
    port: 3306,
    user: "tester",
    database: "sasat_test_example",
  });
  expect(connection.query).toHaveBeenCalledWith(
    "CREATE DATABASE sasat_test_example",
  );
  expect(client.connectionOption).toMatchObject({
    database: "sasat_test_example",
    multipleStatements: true,
  });
  await client.release();
  expect(connection.query).toHaveBeenLastCalledWith(
    "DROP DATABASE sasat_test_example",
  );
});
