import { config } from "../config/config";
import { DBClient } from "./dbClient";
import { MysqlDBClient } from "./mysqlClient";

let client: DBClient | undefined;

export const getDbClient = () => {
  if (!client) client = new MysqlDBClient(config().db);
  return client;
};
