import { readFileSync } from "node:fs";
import path from "node:path";
import { generateTestMigrationFile } from "@/cli/commands/generateTestMigrationFile.js";
import { config, setConfig } from "@/config/config.js";
import { MysqlClient } from "@/db/connectors/mysql/client.js";
import { PostgresClient } from "../db/connectors/postgres/client.js";

export async function readTestMigration() {
  let d: Buffer;
  try {
    d = readTestMigFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const conf = config();
    if (conf.migration.db) {
      setConfig({ db: conf.migration.db });
    }
    const settings = config().migration.db ?? config().db;
    const client =
      settings.dialect === "postgres"
        ? new PostgresClient(settings)
        : new MysqlClient(settings);
    try {
      await generateTestMigrationFile(client);
    } finally {
      await client.release();
    }
    d = readTestMigFile();
  }
  return JSON.parse(d.toString()) as string[];
}

function readTestMigFile() {
  return readFileSync(path.join(config().migration.dir, "test.migration.json"));
}
