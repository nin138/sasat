import { MockDBClient } from "./mockClient.js";

class Client extends MockDBClient {
  // biome-ignore lint/complexity/noUselessConstructor: Expose the inherited protected constructor for this test.
  constructor() {
    super();
  }
}

test("provides no-op queries and transactions without connecting to a database", async () => {
  const client = new Client();
  await expect(client.rawQuery("SELECT 1")).resolves.toEqual([]);
  const transaction = await client.transaction();
  await expect(transaction.rawQuery("SELECT 2")).resolves.toEqual([]);
  await expect(transaction.commit()).resolves.toBeUndefined();
  await expect(transaction.rollback()).resolves.toBeUndefined();
  await expect(client.release()).resolves.toBeUndefined();
});

test("supports parameterized no-op queries and commands on the client and transaction", async () => {
  const client = new Client();
  for (const executor of [client, await client.transaction()]) {
    await expect(
      executor.executeQuery({ text: "SELECT ?", values: [1] }),
    ).resolves.toEqual([]);
    await expect(
      executor.executeCommand({ text: "INSERT ?", values: [1] }),
    ).resolves.toEqual({ insertId: 0, affectedRows: 0, changedRows: 0 });
  }
});

test("mock clients expose the same managed transaction surface", async () => {
  const client = new Client();
  await expect(
    client.withTransaction(
      async (tx) => {
        expect(tx.supportsParameterizedStatements).toBe(true);
        await tx.executeCommand({ text: "INSERT ?", values: [1] });
        return "mock";
      },
      { connection: "discard" },
    ),
  ).resolves.toBe("mock");
  const error = new Error("failed");
  await expect(
    client.withTransaction(async () => {
      throw error;
    }),
  ).rejects.toBe(error);
});
