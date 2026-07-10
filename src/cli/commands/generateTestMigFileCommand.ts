import { generateTestMigrationFile } from "@/cli/commands/generateTestMigrationFile.js";
import { Console } from "@/cli/console.js";
import { config, setConfig } from "@/config/config.js";
import { getDbClient } from "@/db/getDbClient.js";

export async function generateTestMigFileCommand({
  silent,
}: {
  silent: boolean;
}) {
  const conf = config();
  if (conf.migration.db) {
    setConfig({ db: conf.migration.db });
  }
  const client = getDbClient();
  await generateTestMigrationFile(client).catch(async (e) => {
    await client.release();
    Console.error(e);
    process.exit(1);
  });
  await client.release();
  if (!silent) {
    Console.success("successfully generated");
  }
}
