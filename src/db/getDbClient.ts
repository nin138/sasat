import { DBClient } from './dbClient';
import { MariaDBClient } from './mariaDBClient';

let client: DBClient | undefined;

export const getDbClient = () => {
  if (!client) client = new MariaDBClient();
  return client;
};
