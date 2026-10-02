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
