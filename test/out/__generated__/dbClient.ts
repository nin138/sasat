import { isDeepStrictEqual } from 'node:util';
import { getDbConfig } from 'sasat';
import { createMysqlPoolClient } from 'sasat/mysql';

type Client = ReturnType<typeof createMysqlPoolClient>;
type Options = Parameters<typeof createMysqlPoolClient>[0];
type Logger = Parameters<typeof createMysqlPoolClient>[1];
let client: Client | undefined;
let initialConfig: ReturnType<typeof getDbConfig> | undefined;
let initialOptions: object | undefined;
let initialLogger: Logger;

/** Shared only by this generated module; pool connections are opened lazily. */
export function getDbClient(options?: Options, logger?: Logger): Client {
  const dbConfig = getDbConfig();
  const { dialect = 'mysql', ...connection } = dbConfig;
  if (dialect !== 'mysql')
    throw new Error('db.dialect differs from the generated client. Regenerate code for the selected database.');
  if (client && !client.isReleased()) {
    if (
      !isDeepStrictEqual(dbConfig, initialConfig) ||
      (options !== undefined && !isDeepStrictEqual({ ...connection, ...options }, initialOptions)) ||
      (logger !== undefined && logger !== initialLogger)
    ) throw new Error('Database client is already initialized with different settings. Release it before changing settings, or inject a separate client.');
    return client;
  }
  const settings = { ...connection, ...options };
  const next = createMysqlPoolClient(settings, logger);
  initialConfig = dbConfig;
  initialOptions = settings;
  initialLogger = logger;
  client = next;
  return next;
}

/** Does not initialize an unused client. Finish outstanding work before calling. */
export async function releaseDbClient(): Promise<void> {
  if (client) await client.release();
}
