import { randomFillSync } from "node:crypto";
import { config, type SasatDBConfigBase } from "@/config/config.js";
import { readTestMigration } from "@/testing/readTestMigration.js";
import { TestDBClient } from "@/testing/testDBClient.js";
import { PostgresTestDBClient } from "./postgresTestDBClient.js";

const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const N = 8;

export async function makeTestDB(conf?: SasatDBConfigBase) {
  const c = conf ?? config().testDB ?? config().db;
  const dialect = c.dialect ?? config().db.dialect ?? "mysql";
  if (dialect !== (config().db.dialect ?? "mysql")) {
    throw new Error(
      "Test database dialect must match db.dialect; test.migration.json is dialect-specific",
    );
  }
  const settings = {
    host: c.host,
    port: +c.port,
    user: c.user,
    password: c.password,
    database:
      "sasat_test_" +
      Array.from(randomFillSync(new Uint8Array(N)))
        .map((n) => S[(n as number) % S.length])
        .join(""),
  };
  const client =
    dialect === "postgres"
      ? await PostgresTestDBClient.create({ ...c, ...settings })
      : await TestDBClient.create(settings);
  try {
    const migration = await readTestMigration();
    if (migration.length) await client.rawQuery(migration.join(";"));
    return client;
  } catch (error) {
    await client.release();
    throw error;
  }
}
