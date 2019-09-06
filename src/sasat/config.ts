import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import { SassatRedisCacheType } from "./redisCacheConf";

interface SassatConfigDb {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface SassatConfigRedis {
  host: string;
  port: number;
  password: string;
}

export interface SassatConfig {
  db: SassatConfigDb;
  redis: SassatConfigRedis;
  initCaches: SassatRedisCacheType[];
}

export class SassatConfigLoader {
  private static loadFile() {
    const fileName = "sassat.config.yml";
    const filepath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filepath)) throw new Error(`${fileName} not Found in Project root folder`);
    return yaml.safeLoad(fs.readFileSync(filepath, "utf8"));
  }

  readonly db: SassatConfigDb;
  readonly redis: SassatConfigRedis;
  readonly initCaches: SassatRedisCacheType[];

  constructor() {
    const obj = SassatConfigLoader.loadFile();
    this.db = (this.readDBConf(obj.db) as unknown) as any;
    this.redis = (this.readRedisConf(obj.redis) as unknown) as any;
    this.initCaches = this.readCacheConf(obj.cache);
  }

  getConfig(): SassatConfig {
    return {
      db: this.db,
      redis: this.redis,
      initCaches: this.initCaches,
    };
  }

  private readDBConf(conf: { [key: string]: string }) {
    return {
      host: this.readValue(conf.host),
      port: this.readValue(conf.port),
      user: this.readValue(conf.user),
      password: this.readValue(conf.password),
      database: this.readValue(conf.database),
    };
  }

  private readRedisConf(conf: { [key: string]: string }) {
    return {
      host: this.readValue(conf.host),
      port: this.readValue(conf.port),
      password: this.readValue(conf.password),
    };
  }

  private readCacheConf(conf: { [key: string]: any }): SassatRedisCacheType[] {
    return Object.entries(conf).map(([key, value]: any, index) => {
      return {
        name: key,
        ...value,
        type: value.type.toLowerCase(),
        keyPrefix: value.keyPrefix || `${index}__`,
      };
    });
  }

  private readValue(value: string) {
    if (!value) return value;
    if (value.startsWith("$")) return process.env[value.slice(1)];
    return value;
  }
}
