import { MariaDBClient } from "./mariaDBClient";
import { config } from "../config/config";
import { SQLClient } from "./dbClient";

let client: SQLClient | undefined;

export const getDbClient = () => {
  if (!client) client = new MariaDBClient(config.db);
  return client;
};
