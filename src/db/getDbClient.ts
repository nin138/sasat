import { MariaDBClient } from "./mariaDBClient";
import { config } from "../config/config";
import { DBClient } from "./dbClient";

let client: DBClient | undefined;

export const getDbClient = () => {
  if (!client) client = new MariaDBClient(config().db);
  return client;
};
