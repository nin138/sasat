import { config } from '@/config/config.js';
import { PoolOptions } from 'mysql2/promise';
import { DBClient } from './connectors/dbClient.js';
import { MysqlPoolClient } from './connectors/mysql/poolClient.js';

let client: DBClient | undefined;
// TODO check is args changed
export const getDbClient = (
  option?: Partial<PoolOptions>,
  logger?: (query: string) => void,
): DBClient => {
  if (client && !client.isReleased()) return client;
  client = new MysqlPoolClient(
    {
      ...config().db,
      ...option,
    },
    logger,
  );
  return client;
};
