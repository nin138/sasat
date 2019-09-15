import { MariaDBClient } from "./mariaDBClient";
import { config } from "../config/config";

const client = new MariaDBClient(config.db);

export const getDbClient = () => client;
