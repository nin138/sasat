import { SasatRedisCacheType } from "../sasat/redisCacheConf";
import { SasatConfigLoader } from "./loader";

export interface SasatConfigDb {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface SasatConfigRedis {
  host: string;
  port: number;
  password: string;
}

export interface SasatConfigMigration {
  table: string;
  dir: string;
  out: string;
}

export interface SasatConfig {
  db: SasatConfigDb;
  redis: SasatConfigRedis;
  initCaches: SasatRedisCacheType[];
  migration: SasatConfigMigration;
}

export const config: SasatConfig = new SasatConfigLoader().getConfig();
