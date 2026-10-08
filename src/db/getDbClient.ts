import { isDeepStrictEqual } from "node:util";
import type { PoolOptions } from "mysql2/promise";
import type { PoolConfig } from "pg";
import { config, type SasatConfigDB } from "@/config/config.js";
import type { DBClient } from "./connectors/dbClient.js";
import { MysqlPoolClient } from "./connectors/mysql/poolClient.js";
import { PostgresClient } from "./connectors/postgres/client.js";
import type { DatabaseDriver } from "./drivers.js";

let client: DBClient | undefined;
let initialConfig: SasatConfigDB | undefined;
let initialOptions: object | undefined;
let initialLogger: ((query: string) => void) | undefined;
let initialDriver: DatabaseDriver["driver"] | undefined;

/** Reuses the active pool; conflicting settings require releasing it first. */
export const getDbClient = (
  option?: Partial<PoolOptions> | PoolConfig,
  logger?: (query: string) => void,
  driver?: DatabaseDriver,
): DBClient => {
  const dbConfig = config().db;
  const { dialect = "mysql", ...connection } = dbConfig;
  if (driver && driver.dialect !== dialect)
    throw new Error("The supplied database driver does not match db.dialect");
  if (client && !client.isReleased()) {
    if (
      !isDeepStrictEqual(dbConfig, initialConfig) ||
      (option !== undefined &&
        !isDeepStrictEqual({ ...dbConfig, ...option }, initialOptions)) ||
      (logger !== undefined && logger !== initialLogger) ||
      (driver !== undefined && driver.driver !== initialDriver)
    ) {
      throw new Error(
        "Database client is already initialized with different settings. Release it before changing settings, or inject a separate client.",
      );
    }
    return client;
  }
  if (dialect !== "mysql" && dialect !== "postgres")
    throw new Error("db.dialect must be mysql or postgres");
  initialConfig = structuredClone(dbConfig);
  initialOptions = { ...structuredClone(dbConfig), ...option };
  initialLogger = logger;
  initialDriver = driver?.driver;
  client =
    dialect === "postgres"
      ? new PostgresClient(
          { ...structuredClone(connection), ...option } as PoolConfig,
          logger,
          driver?.dialect === "postgres" ? driver.driver : undefined,
        )
      : new MysqlPoolClient(
          { ...structuredClone(connection), ...option } as PoolOptions,
          logger,
          driver?.dialect === "mysql" ? driver.driver : undefined,
        );
  return client;
};
