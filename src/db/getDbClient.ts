import { isDeepStrictEqual } from "node:util";
import type { PoolOptions } from "mysql2/promise";
import { config, type SasatConfigDB } from "@/config/config.js";
import type { DBClient } from "./connectors/dbClient.js";
import { MysqlPoolClient } from "./connectors/mysql/poolClient.js";

let client: MysqlPoolClient | undefined;
let initialConfig: SasatConfigDB | undefined;
let initialLogger: ((query: string) => void) | undefined;

/** Reuses the active pool; conflicting settings require releasing it first. */
export const getDbClient = (
  option?: Partial<PoolOptions>,
  logger?: (query: string) => void,
): DBClient => {
  const dbConfig = config().db;
  if (client && !client.isReleased()) {
    if (
      !isDeepStrictEqual(dbConfig, initialConfig) ||
      (option !== undefined &&
        !isDeepStrictEqual({ ...dbConfig, ...option }, client.poolOption)) ||
      (logger !== undefined && logger !== initialLogger)
    ) {
      // Never include connection settings or credentials in this error.
      throw new Error(
        "Database client is already initialized with different settings. Release it before changing settings, or inject a separate client.",
      );
    }
    return client;
  }
  initialConfig = structuredClone(dbConfig);
  initialLogger = logger;
  client = new MysqlPoolClient(
    { ...structuredClone(dbConfig), ...option },
    logger,
  );
  return client;
};
