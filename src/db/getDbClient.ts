import { DBClient } from './connectors/dbClient.js';
import { MysqlClient } from './connectors/mysql/client.js';

let client: DBClient | undefined;

export const getDbClient = (): DBClient => {
  if (client && !client.isReleased()) return client;
  client = new MysqlClient();
  return client;
};
