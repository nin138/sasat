import { DBClient } from './connectors/dbClient';
import { MysqlClient } from './connectors/mysql/client';

let client: DBClient | undefined;

export const getDbClient = (): DBClient => {
  if (client && !client.isReleased()) return client;
  client = new MysqlClient();
  return client;
};
