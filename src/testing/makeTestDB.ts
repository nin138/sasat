import { randomFillSync } from "node:crypto";
import { config, type SasatDBConfigBase } from "@/config/config.js";
import { readTestMigration } from "@/testing/readTestMigration.js";
import { TestDBClient } from "@/testing/testDBClient.js";

const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const N = 8;

export async function makeTestDB(conf?: SasatDBConfigBase) {
  const c = conf ?? config().testDB ?? config().db;
  const client = await TestDBClient.create({
    host: c.host,
    port: +c.port,
    user: c.user,
    password: c.password,
    database:
      "sasat_test_" +
      Array.from(randomFillSync(new Uint8Array(N)))
        .map((n) => S[(n as number) % S.length])
        .join(""),
  });

  const migration = await readTestMigration();
  await client.rawQuery(migration.join(";"));
  return client;
}
