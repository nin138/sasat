import type { SqlStatement } from "../sqlStatement.js";
import { SQLClient } from "./dbClient.js";

class LegacyClient extends SQLClient {
  protected execSql = jest.fn(async () => []);
}
class BoundClient extends LegacyClient {
  protected execStatement = jest.fn(async (_statement: SqlStatement) => []);
  inspect = this.execStatement;
}

test("legacy custom clients retain raw execution but explicitly reject binding", async () => {
  const client = new LegacyClient();
  await expect(client.rawQuery("SELECT 1")).resolves.toEqual([]);
  for (const method of ["executeQuery", "executeCommand"] as const)
    await expect(
      client[method]({ text: "SELECT ?", values: [1] }),
    ).rejects.toThrow("does not support parameterized");
});

test.each([
  undefined,
  NaN,
  Infinity,
  -Infinity,
  {},
  [1],
  () => "secret",
  new Date(NaN),
])(
  "rejects unsupported bind values without dispatch or disclosure (%p)",
  async (value) => {
    const client = new BoundClient();
    await expect(
      client.executeQuery({
        text: "SELECT ?",
        values: [value],
      } as unknown as SqlStatement),
    ).rejects.toThrow("Invalid SQL parameter at index 0");
    expect(client.inspect).not.toHaveBeenCalled();
  },
);

test("rejects sparse arrays and malformed statements", async () => {
  const client = new BoundClient();
  await expect(
    client.executeQuery({ text: "SELECT ?", values: Array(1) }),
  ).rejects.toThrow("index 0");
  await expect(
    client.executeQuery({ text: "SELECT 1" } as SqlStatement),
  ).rejects.toThrow("values array");
  expect(client.inspect).not.toHaveBeenCalled();
});

test("snapshots mutable inputs and preserves exact bigint values before dispatch", async () => {
  const client = new BoundClient();
  const date = new Date("2026-01-01T00:00:00Z");
  const buffer = Buffer.from("original");
  const statement = {
    text: "SELECT ?, ?, ?, ?, ?, ?, ?",
    values: [
      date,
      buffer,
      9007199254740993n,
      "0.123456789012345678",
      null,
      false,
      0,
    ],
  };
  const pending = client.executeQuery(statement);
  statement.text = "changed";
  statement.values[2] = 1n;
  date.setUTCFullYear(2000);
  buffer.fill(0);
  await pending;
  expect(client.inspect).toHaveBeenCalledWith(
    {
      text: "SELECT ?, ?, ?, ?, ?, ?, ?",
      values: [
        new Date("2026-01-01T00:00:00Z"),
        Buffer.from("original"),
        "9007199254740993",
        "0.123456789012345678",
        null,
        false,
        0,
      ],
    },
    "query",
  );
});
