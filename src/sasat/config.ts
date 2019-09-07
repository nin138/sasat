import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import { SasatRedisCacheType } from "./redisCacheConf";

interface SasatConfigDb {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface SasatConfigRedis {
  host: string;
  port: number;
  password: string;
}

export interface SasatConfig {
  db: SasatConfigDb;
  redis: SasatConfigRedis;
  initCaches: SasatRedisCacheType[];
}

export class SasatConfigLoader {
  private static loadFile() {
    const fileName = "sasat.config.yml";
    const filepath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filepath)) throw new Error(`${fileName} not Found in Project root folder`);
    return yaml.safeLoad(fs.readFileSync(filepath, "utf8"));
  }

  readonly db: SasatConfigDb;
  readonly redis: SasatConfigRedis;
  readonly initCaches: SasatRedisCacheType[];

  constructor() {
    const obj = SasatConfigLoader.loadFile();
    this.db = (this.readDBConf(obj.db) as unknown) as any;
    this.redis = (this.readRedisConf(obj.redis) as unknown) as any;
    this.initCaches = this.readCacheConf(obj.cache);
  }

  getConfig(): SasatConfig {
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
      connectionLimit: this.readValue(conf.connectionLimit),
    };
  }

  private readRedisConf(conf: { [key: string]: string }) {
    return {
      host: this.readValue(conf.host),
      port: this.readValue(conf.port),
      password: this.readValue(conf.password),
    };
  }

  private readCacheConf(conf: { [key: string]: any }): SasatRedisCacheType[] {
    return Object.entries(conf).map(([key, value]: any, index) => {
      return {
        name: key,
        type: value.type.toLowerCase(),
        keyPrefix: value.keyPrefix || `${index}__`,
        isKeyAutoIncrement: value.key_auto_increment,
        ...value,
      };
    });
  }

  private readValue(value: string) {
    if (!value) return value;
    if (typeof value === "string" && value.startsWith("$")) return process.env[value.slice(1)];
    return value;
  }
}
