import { PostgresClient } from "../db/connectors/postgres/client.js";
import { PostgresTestDBClient } from "./postgresTestDBClient.js";

const settings = {
  host: "unused",
  port: 5432,
  user: "tester",
  database: 'sasat_test_"quoted',
};
function setup() {
  return {
    query: jest
      .spyOn(PostgresClient.prototype, "rawQuery")
      .mockResolvedValue([]),
    release: jest.spyOn(PostgresClient.prototype, "release"),
  };
}
test("creates an isolated quoted database through postgres and drops it only once", async () => {
  const { query, release } = setup();
  const client = await PostgresTestDBClient.create(settings);
  expect(query).toHaveBeenCalledWith('CREATE DATABASE "sasat_test_""quoted"');
  expect(query.mock.contexts[0].poolOption.database).toBe("postgres");
  expect(client.poolOption.database).toBe(settings.database);
  expect(release.mock.contexts[0].isReleased()).toBe(true);
  await client.release();
  await client.release();
  expect(query.mock.calls).toEqual([
    ['CREATE DATABASE "sasat_test_""quoted"'],
    ['DROP DATABASE IF EXISTS "sasat_test_""quoted"'],
  ]);
  expect(client.isReleased()).toBe(true);
  expect(query.mock.contexts[1].isReleased()).toBe(true);
});
test("releases the administrative client when database creation fails", async () => {
  const { query, release } = setup();
  const error = new Error("create denied");
  query.mockRejectedValueOnce(error);
  await expect(PostgresTestDBClient.create(settings)).rejects.toBe(error);
  expect(release).toHaveBeenCalledTimes(1);
  expect(query.mock.contexts[0].isReleased()).toBe(true);
});
test("releases failed drop connections and permits a cleanup retry", async () => {
  const { query } = setup();
  const client = await PostgresTestDBClient.create(settings);
  const error = new Error("database in use");
  query.mockRejectedValueOnce(error);
  await expect(client.release()).rejects.toBe(error);
  expect(client.isReleased()).toBe(true);
  expect(query.mock.contexts[1].isReleased()).toBe(true);
  await client.release();
  expect(
    query.mock.calls.filter(([sql]) => sql.startsWith("DROP")),
  ).toHaveLength(2);
  expect(query.mock.contexts[2].isReleased()).toBe(true);
});
