import type { NestedPartial } from "../util/type.js";
import { SasatConfigLoader } from "./loader.js";
import { mergeConfig } from "./validate.js";

export type SasatDBConfigBase = {
  /** Defaults to mysql for backward compatibility. */
  dialect?: "mysql" | "postgres";
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: {
    ca?: string[];
  };
};

export type SasatConfigDB = SasatDBConfigBase;

const defaultConfDb: SasatConfigDB = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  database: "sasat",
  password: "",
};

// export interface SasatConfigRedis {
//   host: string;
//   port: number;
//   password?: string;
// }

// const defaultCofRedis: SasatConfigRedis = {
//   host: '127.0.0.1',
//   port: 6379,
// };

export interface SasatConfigMigration {
  table: string;
  dir: string;
  out: string;
  target?: string;
  db?: SasatConfigDB;
}

export type MigrationBuildConfig = Pick<SasatConfigMigration, "dir" | "target">;

const defaultConfMigration: SasatConfigMigration = {
  table: "__migrate__",
  dir: "migrations",
  out: "sasat",
};

export interface SasatConfigGenerator {
  addJsExtToImportStatement: boolean;
  gql: {
    subscription: boolean;
  };
}

export interface SasatConfig {
  db: SasatConfigDB;
  testDB?: SasatConfigDB;
  migration: SasatConfigMigration;
  generator: SasatConfigGenerator;
  // redis: SasatConfigRedis;
}

export type PartialSasatConfig = NestedPartial<SasatConfig>;

export const defaultConf: SasatConfig = {
  db: defaultConfDb,
  migration: defaultConfMigration,
  generator: {
    addJsExtToImportStatement: false,
    gql: {
      subscription: true,
    },
  },
  // redis: defaultCofRedis,
};

let conf: SasatConfig | undefined;
export const config = (): SasatConfig => {
  if (conf === undefined) conf = new SasatConfigLoader().getConfig();
  return conf;
};

/** Offline compilation must not resolve or cache database connection settings. */
export function getMigrationBuildConfig(): MigrationBuildConfig {
  if (conf) return { dir: conf.migration.dir, target: conf.migration.target };
  return SasatConfigLoader.getMigrationBuildConfig();
}

export function setConfig(update: NestedPartial<SasatConfig>): SasatConfig {
  conf = mergeConfig(config(), update);
  return conf;
}

/** A snapshot for application-owned database clients; contains connection secrets. */
export function getDbConfig(): SasatConfigDB {
  return structuredClone(config().db);
}
