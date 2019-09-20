import { DBClient } from './dbClient';
import { MariaDBClient } from './mariadb/client';

let client: DBClient | undefined;

export const getDbClient = () => {
  if (!client) client = new MariaDBClient();
  return client;
};
