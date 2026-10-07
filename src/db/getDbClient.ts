import { isDeepStrictEqual } from "node:util";
import type { PoolOptions } from "mysql2/promise";
import type { PoolConfig } from "pg";
import { config, type SasatConfigDB } from "@/config/config.js";
import type { DBClient } from "./connectors/dbClient.js";
import { MysqlPoolClient } from "./connectors/mysql/poolClient.js";
import { PostgresClient } from "./connectors/postgres/client.js";

let client: DBClient | undefined;
let initialConfig: SasatConfigDB | undefined;
let initialOptions: object | undefined;
let initialLogger: ((query: string) => void) | undefined;

/** Reuses the active pool; conflicting settings require releasing it first. */
export const getDbClient = (
  option?: Partial<PoolOptions> | PoolConfig,
  logger?: (query: string) => void,
): DBClient => {
  const dbConfig = config().db;
  if (client && !client.isReleased()) {
    if (
      !isDeepStrictEqual(dbConfig, initialConfig) ||
      (option !== undefined &&
        !isDeepStrictEqual({ ...dbConfig, ...option }, initialOptions)) ||
      (logger !== undefined && logger !== initialLogger)
    ) {
      throw new Error(
        "Database client is already initialized with different settings. Release it before changing settings, or inject a separate client.",
      );
    }
    return client;
  }
  const { dialect = "mysql", ...connection } = dbConfig;
  if (dialect !== "mysql" && dialect !== "postgres")
    throw new Error("db.dialect must be mysql or postgres");
  initialConfig = structuredClone(dbConfig);
  initialOptions = { ...structuredClone(dbConfig), ...option };
  initialLogger = logger;
  client =
    dialect === "postgres"
      ? new PostgresClient(
          { ...structuredClone(connection), ...option } as PoolConfig,
          logger,
        )
      : new MysqlPoolClient(
          { ...structuredClone(connection), ...option } as PoolOptions,
          logger,
        );
  return client;
};
