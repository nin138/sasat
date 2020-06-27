import { DBClient } from './dbClient';
import { MysqlClient } from './mysql/client';

let client: DBClient | undefined;

export const getDbClient = (): DBClient => {
  if (client && !client.isReleased()) return client;
  client = new MysqlClient();
  return client;
};
