import * as path from "path";
import * as fs from "fs";
import { SasatRedisCacheType } from "../sasat/redisCacheConf";
import { defaultConf, SasatConfig } from "./config";
import { readYmlFile } from "../util";

// TODO refactoring and default value
export class SasatConfigLoader {
  private static loadFile() {
    const fileName = "sasat.yml";
    const filepath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filepath)) throw new Error(`${fileName} not Found in Project root folder`);
    return readYmlFile(filepath);
  }

  readonly conf: SasatConfig;

  constructor() {
    const obj = SasatConfigLoader.loadFile();
    this.conf = {
      db: this.readConf(defaultConf.db, obj.db),
      redis: this.readConf(defaultConf.redis, obj.redis),
      migration: this.readConf(defaultConf.migration, obj.migration),
      initCaches: this.readCacheConf(obj.cache),
    };
  }

  getConfig(): SasatConfig {
    return this.conf;
  }

  private readConf(def: any, conf: { [key: string]: any }): any {
    return {
      ...def,
      ...this.readObj(conf),
    };
  }

  private readObj(obj: { [key: string]: any }) {
    for (const key in obj) obj[key] = this.readValue(obj[key]);
    return obj;
  }

  private readCacheConf(conf: { [key: string]: any }): SasatRedisCacheType[] {
    if (typeof conf !== "object") return [];
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

  private readValue(value: any): any {
    if (!value) return value;
    if (Array.isArray(value)) return value.map(it => this.readValue(it));
    if (typeof value === "string" && value.startsWith("$")) return process.env[value.slice(1)];
    if (typeof value === "object") {
      for (const key in value) value[key] = this.readValue(value[key]);
      return value;
    }
    return value;
  }
}
