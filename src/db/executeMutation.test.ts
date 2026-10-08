import { QExpr as q } from "../runtime/dsl/factory.js";
import { executeMutation } from "./executeMutation.js";
import { createSqlGenerator } from "./sqlGenerator.js";

const tableInfo = {
  users: {
    identifiableKeys: ["id"],
    identifiableFields: ["id"],
    columnMap: { id: "id", name: "name" },
  },
};
const mutations: Parameters<typeof executeMutation>[1][] = [
  {
    kind: "create",
    dsl: { table: "users", fields: ["name"], entities: [["O'Reilly"]] },
    tableInfo,
  },
  {
    kind: "update",
    dsl: {
      table: "users",
      values: [{ field: "name", value: "O'Reilly" }],
      where: q.eq(q.field("users", "id"), q.value(1)),
    },
    tableInfo,
  },
  {
    kind: "delete",
    dsl: { table: "users", where: q.eq(q.field("users", "id"), q.value(1)) },
  },
];

test.each(mutations)(
  "$kind propagates a bound write failure without a raw retry",
  async (mutation) => {
    const error = new Error("write failed");
    const client = {
      sql: createSqlGenerator("postgres"),
      supportsParameterizedStatements: true,
      executeCommand: jest.fn().mockRejectedValue(error),
      rawQuery: jest.fn(),
      rawCommand: jest.fn(),
    };
    await expect(executeMutation(client, mutation)).rejects.toBe(error);
    expect(client.executeCommand).toHaveBeenCalledTimes(1);
    expect(client.rawCommand).not.toHaveBeenCalled();
    expect(client.executeCommand.mock.calls[0][0].text).not.toContain(
      "O'Reilly",
    );
  },
);

test.each(mutations)(
  "$kind retains string execution for legacy executors",
  async (mutation) => {
    const client = {
      sql: createSqlGenerator("mysql"),
      executeCommand: jest.fn(),
      rawQuery: jest.fn(),
      rawCommand: jest
        .fn()
        .mockResolvedValue({ insertId: 1, affectedRows: 1, changedRows: 0 }),
    };
    await executeMutation(client, mutation);
    expect(client.rawCommand).toHaveBeenCalledTimes(1);
    expect(typeof client.rawCommand.mock.calls[0][0]).toBe("string");
    expect(client.executeCommand).not.toHaveBeenCalled();
  },
);

test("advertised support without executeCommand fails before executing a write", () => {
  const client = {
    supportsParameterizedStatements: true,
    executeQuery: jest.fn(),
    rawQuery: jest.fn(),
    rawCommand: jest.fn(),
  };
  expect(() => executeMutation(client, mutations[0])).toThrow(
    "requires executeCommand",
  );
  expect(client.rawCommand).not.toHaveBeenCalled();
});
