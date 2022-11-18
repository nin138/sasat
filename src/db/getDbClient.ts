import { DBClient } from './connectors/dbClient.js';
import { MysqlClient } from './connectors/mysql/client.js';

let client: DBClient | undefined;
// TODO check is args changed
export const getDbClient = (
  ...config: ConstructorParameters<typeof MysqlClient>
): DBClient => {
  if (client && !client.isReleased()) return client;
  client = new MysqlClient(...config);
  return client;
};
