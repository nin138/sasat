import type { PoolOptions } from "mysql2/promise";
import { config } from "@/config/config.js";
import type { DBClient } from "./connectors/dbClient.js";
import { MysqlPoolClient } from "./connectors/mysql/poolClient.js";

let client: DBClient | undefined;
// TODO check is args changed
export const getDbClient = (
  option?: Partial<PoolOptions>,
  logger?: (query: string) => void,
): DBClient => {
  if (client && !client.isReleased()) return client;
  client = new MysqlPoolClient(
    {
      ...config().db,
      ...option,
    },
    logger,
  );
  return client;
};
