import { QExpr as q } from "../runtime/dsl/factory.js";
import { SQLClient } from "./connectors/dbClient.js";
import { executeSelect } from "./executeSelect.js";
import { createSqlGenerator } from "./sqlGenerator.js";

const query = {
  select: [q.field("u", "id")],
  from: q.table("users", [], "u"),
  where: q.eq(q.field("u", "id"), q.value(7)),
};

class LegacyClient extends SQLClient {
  protected execSql = jest.fn(async () => [{ id: 7 }]);
  calls = this.execSql;
}

test("custom clients inheriting the unsupported binding API retain string queries", async () => {
  const client = new LegacyClient();
  await expect(executeSelect(client, query)).resolves.toEqual([{ id: 7 }]);
  expect(client.calls).toHaveBeenCalledWith(
    createSqlGenerator("mysql").query(query),
  );
});

test("custom executors explicitly opt into binding and propagate failures without raw retry", async () => {
  const error = new Error("execute failed");
  const client = {
    sql: createSqlGenerator("postgres"),
    supportsParameterizedStatements: true,
    rawQuery: jest.fn(),
    rawCommand: jest.fn(),
    executeQuery: jest.fn().mockRejectedValue(error),
  };
  await expect(executeSelect(client, query)).rejects.toBe(error);
  expect(client.executeQuery).toHaveBeenCalledWith({
    text: 'SELECT "u"."id" FROM "users" AS "u" WHERE "u"."id"  = $1::integer',
    values: [7],
  });
  expect(client.rawQuery).not.toHaveBeenCalled();
});

test("a false capability retains legacy behavior even when methods are present", async () => {
  const client = {
    supportsParameterizedStatements: false,
    rawQuery: jest.fn().mockResolvedValue([]),
    rawCommand: jest.fn(),
    executeQuery: jest.fn(),
  };
  await executeSelect(client, query);
  expect(client.rawQuery).toHaveBeenCalledTimes(1);
  expect(client.executeQuery).not.toHaveBeenCalled();
});

test("an incorrectly advertised capability fails before executing any SQL", () => {
  const client = {
    supportsParameterizedStatements: true,
    rawQuery: jest.fn(),
    rawCommand: jest.fn(),
  };
  expect(() => executeSelect(client, query)).toThrow("requires executeQuery");
  expect(client.rawQuery).not.toHaveBeenCalled();
});

test("spreading a built-in client into an old raw wrapper does not copy capability without methods", async () => {
  const { PostgresClient } = await import("./connectors/postgres/client.js");
  const original = new PostgresClient({});
  const client = {
    ...original,
    rawQuery: jest.fn().mockResolvedValue([]),
    rawCommand: jest.fn(),
  };
  expect(original.supportsParameterizedStatements).toBe(true);
  expect("supportsParameterizedStatements" in client).toBe(false);
  await executeSelect(client, query);
  expect(client.rawQuery).toHaveBeenCalledWith(
    createSqlGenerator("postgres").query(query),
  );
  await original.release();
});
