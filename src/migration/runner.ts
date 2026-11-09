import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { config, loadConfigFile, setConfig } from "../config/config.js";
import type { DBClient } from "../db/connectors/dbClient.js";
import type { DatabaseDriver } from "../db/drivers.js";
import { getDbClient } from "../db/getDbClient.js";
import { MigrationController } from "./controller.js";
import { getCurrentMigration } from "./exec/getCurrentMigration.js";
import { resolveMigrationTarget } from "./exec/getMigrationTarget.js";
import type { MigrationDefinitions } from "./exec/migrationDefinitions.js";
import { withMigrationLock } from "./exec/withMigrationLock.js";

/** Entry point used by migration:build --standalone. Does not load config on import. */
export async function runMigrationBundle(
  definitions: MigrationDefinitions,
  driver: DatabaseDriver,
  args = process.argv.slice(2),
  createClient: () => DBClient | Promise<DBClient> = () =>
    getDbClient(undefined, undefined, driver),
): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      config: { type: "string", short: "c" },
      target: { type: "string", short: "t" },
      dry: { type: "boolean", short: "d" },
      silent: { type: "boolean", short: "s" },
      list: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(`Usage: node migration.cjs [options]
Apply the embedded migrations using sasat.yml in the current directory.
  -c, --config <file>  Configuration file
  -t, --target <name>  Exact embedded migration filename (including .ts)
  -d, --dry            Preview SQL; read history without applying changes
  -s, --silent         Suppress progress and SQL output
      --list           List embedded migrations without connecting
  -h, --help           Show help
Bundled database dialect: ${driver.dialect}`);
    return;
  }
  if (values.list) {
    console.log(definitions.files.join("\n"));
    return;
  }
  const filename = path.resolve(values.config ?? "sasat.yml");
  if (!existsSync(filename))
    throw new Error("Migration configuration file not found");
  const conf = loadConfigFile(filename);
  if (conf.migration.db) setConfig({ db: conf.migration.db });
  if (values.target !== undefined)
    setConfig({ migration: { target: values.target } });
  if ((config().db.dialect ?? "mysql") !== driver.dialect)
    throw new Error(
      "Database dialect does not match this migration bundle. Rebuild for the configured dialect.",
    );
  resolveMigrationTarget(definitions.files);
  const options = {
    dry: values.dry ?? false,
    silent: values.silent ?? false,
    generateFiles: false,
    skipBuild: true,
  };
  // Load application customization only after configuration and validation.
  const client = await createClient();
  try {
    const apply = async (db: DBClient) => {
      const current = await getCurrentMigration(db, options, definitions.files);
      const result = await new MigrationController(definitions).migrate(
        db,
        current,
        options,
      );
      if (!options.silent)
        console.log(
          `${options.dry ? "dry run target" : "current migration"} is ${result.currentMigration ?? "(initial schema)"}`,
        );
    };
    if (options.dry) await apply(client);
    else await withMigrationLock(client, apply);
  } finally {
    await client.release();
  }
}
