import { SasatRedisCacheType } from "../sasat/redisCacheConf";
import { SasatConfigLoader } from "./loader";

export interface SasatConfigDb {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

const defaultConfDb: SasatConfigDb = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  database: "sasat",
  password: "",
};

export interface SasatConfigRedis {
  host: string;
  port: number;
  password?: string;
}

const defaultCofRedis: SasatConfigRedis = {
  host: "127.0.0.1",
  port: 6379,
};

export interface SasatConfigMigration {
  table: string;
  dir: string;
  out: string;
}

const defaultConfMigration: SasatConfigMigration = {
  table: "__migrate__",
  dir: "migrations",
  out: "sasat",
};

export interface SasatConfig {
  db: SasatConfigDb;
  redis: SasatConfigRedis;
  initCaches: SasatRedisCacheType[];
  migration: SasatConfigMigration;
}

export const defaultConf: SasatConfig = {
  db: defaultConfDb,
  initCaches: [],
  migration: defaultConfMigration,
  redis: defaultCofRedis,
};

let conf: SasatConfig | undefined;
export const config = (): SasatConfig => {
  if (conf === undefined) conf = new SasatConfigLoader().getConfig();
  return conf;
};
