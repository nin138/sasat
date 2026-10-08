import mysql from "mysql2/promise";
import { MysqlClient as BaseMysqlClient } from "../db/connectors/mysql/client.js";
import { MysqlPoolClient as BaseMysqlPoolClient } from "../db/connectors/mysql/poolClient.js";
import { getDbClient as getSharedDbClient } from "../db/getDbClient.js";

export type { MysqlDriver } from "../db/drivers.js";

/** A MySQL connection client with a statically imported, bundleable driver. */
export class MysqlClient extends BaseMysqlClient {
  constructor(
    options: ConstructorParameters<typeof BaseMysqlClient>[0],
    logger?: (query: string) => void,
  ) {
    super(options, logger, mysql);
  }
}

/** An independent MySQL pool with a statically imported, bundleable driver. */
export class MysqlPoolClient extends BaseMysqlPoolClient {
  constructor(
    options: ConstructorParameters<typeof BaseMysqlPoolClient>[0],
    logger?: (query: string) => void,
  ) {
    super(options, logger, mysql);
  }
}

/** Initialize the shared client for db.dialect: mysql (the default). */
export function getDbClient(
  options?: ConstructorParameters<typeof BaseMysqlPoolClient>[0],
  logger?: (query: string) => void,
) {
  return getSharedDbClient(options, logger, {
    dialect: "mysql",
    driver: mysql,
  });
}
