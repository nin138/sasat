import { type DatabaseDialect, getDialect } from "../../../db/dialect.js";
import { ImportDeclaration } from "../../../tsg/importDeclaration.js";

/** Driver choice is generated; connection settings are read only at runtime. */
export function generateDbClient(
  dialect: DatabaseDialect = getDialect(),
): string {
  const factory =
    dialect === "mysql" ? "createMysqlPoolClient" : "createPostgresClient";
  return `import { isDeepStrictEqual } from 'node:util';
import { getDbConfig } from 'sasat';
import { ${factory} } from 'sasat/${dialect}';

type Client = ReturnType<typeof ${factory}>;
type Options = Parameters<typeof ${factory}>[0];
type Logger = Parameters<typeof ${factory}>[1];
let client: Client | undefined;
let initialConfig: ReturnType<typeof getDbConfig> | undefined;
let initialOptions: object | undefined;
let initialLogger: Logger;

/** Shared only by this generated module; pool connections are opened lazily. */
export function getDbClient(options?: Options, logger?: Logger): Client {
  const dbConfig = getDbConfig();
  const { dialect = 'mysql', ...connection } = dbConfig;
  if (dialect !== '${dialect}')
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
  const next = ${factory}(settings, logger);
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
`;
}

/** User-owned extension point, preserved on regeneration. */
export function generateDbClientExtension(): string {
  const declaration = new ImportDeclaration(
    ["getDbClient", "releaseDbClient"],
    "./__generated__/dbClient",
  ).toString();
  return `${declaration}\nexport { getDbClient, releaseDbClient };\n`;
}
