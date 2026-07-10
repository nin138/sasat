import { readFileSync } from "node:fs";
import path from "node:path";
import { generateTestMigrationFile } from "@/cli/commands/generateTestMigrationFile.js";
import { Console } from "@/cli/console.js";
import { config, setConfig } from "@/config/config.js";
import { MysqlClient } from "@/db/connectors/mysql/client.js";

export async function readTestMigration() {
  let d = readTestMigFile();
  if (!d) {
    const conf = config();
    if (conf.migration.db) {
      setConfig({ db: conf.migration.db });
    }
    const client = new MysqlClient({
      ...(config().migration.db ?? config().db),
    });
    await generateTestMigrationFile(client).catch(async (e) => {
      await client.release();
      Console.error(e);
      process.exit(1);
    });
    await client.release();
    d = readTestMigFile();
  }
  return JSON.parse(d.toString()) as string[];
}

function readTestMigFile() {
  return readFileSync(path.join(config().migration.dir, "test.migration.json"));
}
