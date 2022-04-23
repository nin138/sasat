import { SasatConfigLoader } from './loader.js';
import { NestedPartial } from '../util/type.js';

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
  addJsExtToImportStatement: boolean;
  gql: {
    subscription: boolean;
  };
}

export interface SasatConfig {
  db: SasatConfigDb;
  migration: SasatConfigMigration;
  generator: SasatConfigGenerator;
  redis: SasatConfigRedis;
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
  redis: defaultCofRedis,
};

let conf: SasatConfig | undefined;
export const config = (): SasatConfig => {
  if (conf === undefined) conf = new SasatConfigLoader().getConfig();
  return conf;
};
