import { DBClient } from './dbClient';
import { MysqlClient } from './mysql/client';

let client: DBClient | undefined;

export const getDbClient = () => {
  if (!client) client = new MysqlClient();
  return client;
};
