import pg from "pg";
import { PostgresClient as BasePostgresClient } from "../db/connectors/postgres/client.js";
import { getDbClient as getSharedDbClient } from "../db/getDbClient.js";

export type { PostgresDriver } from "../db/drivers.js";

/** An independent PostgreSQL pool with a statically imported, bundleable driver. */
export class PostgresClient extends BasePostgresClient {
  constructor(
    options: ConstructorParameters<typeof BasePostgresClient>[0],
    logger?: (query: string) => void,
  ) {
    super(options, logger, pg);
  }
}

/** Initialize the shared client for db.dialect: postgres. */
export function getDbClient(
  options?: ConstructorParameters<typeof BasePostgresClient>[0],
  logger?: (query: string) => void,
) {
  return getSharedDbClient(options, logger, {
    dialect: "postgres",
    driver: pg,
  });
}
