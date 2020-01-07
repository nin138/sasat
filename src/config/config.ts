import { SasatRedisCacheType } from '../sasat/redisCacheConf';
import { SasatConfigLoader } from './loader';
import { NestedPartial } from '../util/type';

export interface SasatConfigDb {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

const defaultConfDb: SasatConfigDb = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  database: 'sasat',
  password: '',
};

export interface SasatConfigRedis {
  host: string;
  port: number;
  password?: string;
}

const defaultCofRedis: SasatConfigRedis = {
  host: '127.0.0.1',
  port: 6379,
};

export interface SasatConfigMigration {
  table: string;
  dir: string;
  out: string;
  target?: string;
}

const defaultConfMigration: SasatConfigMigration = {
  table: '__migrate__',
  dir: 'migrations',
  out: 'sasat',
};

export interface SasatConfigGenerator {
  gql: {
    subscription: boolean;
  };
}

export interface SasatConfig {
  db: SasatConfigDb;
  migration: SasatConfigMigration;
  generator: SasatConfigGenerator;
  redis: SasatConfigRedis;
  initCaches: SasatRedisCacheType[];
}

export type PartialSasatConfig = NestedPartial<SasatConfig>;

export const defaultConf: SasatConfig = {
  db: defaultConfDb,
  migration: defaultConfMigration,
  generator: {
    gql: {
      subscription: true,
    },
  },
  initCaches: [],
  redis: defaultCofRedis,
};

let conf: SasatConfig | undefined;
export const config = (): SasatConfig => {
  if (conf === undefined) conf = new SasatConfigLoader().getConfig();
  return conf;
};
