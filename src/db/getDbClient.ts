import { DBClient } from './connectors/dbClient.js';
import { MysqlPoolClient } from './connectors/mysql/poolClient.js';

let client: DBClient | undefined;
// TODO check is args changed
export const getDbClient = (
  ...config: ConstructorParameters<typeof MysqlPoolClient>
): DBClient => {
  if (client && !client.isReleased()) return client;
  client = new MysqlPoolClient(...config);
  return client;
};
