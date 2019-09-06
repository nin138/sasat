import { SasatConfigLoader } from "./config";
import { DBClient } from "../db/dbClient";
import { RedisClient } from "../redis/redisClient";

import { MariaDBClient } from "../db/mariaDBClient";
import { initCache } from "./initCache";
import {
  SasatRedisCacheConfHash,
  SasatRedisCacheConfJSONString,
  SasatRedisCacheConfString,
  SasatRedisCacheType,
} from "./redisCacheConf";

export class SasatClient {
  readonly cacheConf: { [name: string]: SasatRedisCacheType } = {};
  private readonly config = new SasatConfigLoader().getConfig();
  private readonly db: DBClient;
  private readonly redis: RedisClient;
  constructor() {
    this.db = new MariaDBClient({
      ...this.config.db,
    });
    this.redis = new RedisClient(this.config.redis.host, this.config.redis.port, this.config.redis.password);

    this.config.initCaches.forEach(it => {
      this.cacheConf[it.name] = it;
    });
  }

  init(): Promise<any> {
    return initCache(this.db, this.redis, this.config.initCaches);
  }

  getString(name: string, key: string) {
    return this.redis.get(this.cacheConf[name].keyPrefix + key);
  }

  updateString(name: string, key: any, value: any) {
    return this.db.transaction().then(async con => {
      const conf = this.cacheConf[name] as SasatRedisCacheConfString;
      const sql = `update ${conf.table} set ${conf.value} = ${this.db.escape(value)} where ${
        conf.key
      } = ${this.db.escape(key)}`;
      const r = await con.rawCommand(sql);
      await this.redis.set(conf.keyPrefix + key, value);
      await con.commit();
      return r;
    });
  }

  getJSONString(name: string, key: string): Promise<{ [key: string]: any } | null> {
    return this.redis.get(this.cacheConf[name].keyPrefix + key).then(it => (it ? JSON.parse(it) : null));
  }

  updateJSONString(name: string, key: string, values: { [key: string]: any }) {
    return this.db.transaction().then(async con => {
      const conf = this.cacheConf[name] as SasatRedisCacheConfJSONString;
      const columns = Object.entries(values)
        .map(([k, v]) => `${k} = ${this.db.escape(v)}`)
        .join(",");
      const sql = `update ${conf.table} set ${columns} where ${conf.key} = ${this.db.escape(key)}`;
      const r = await con.rawCommand(sql);
      await this.redis.set(conf.keyPrefix + key, JSON.stringify(values));
      await con.commit();
      return r;
    });
  }

  getHash(name: string, key: string, column: string): Promise<string | null> {
    return this.redis.hget(this.cacheConf[name].keyPrefix + key, column);
  }

  updateHash(name: string, key: string, values: { [key: string]: any }) {
    return this.db.transaction().then(async con => {
      const conf = this.cacheConf[name] as SasatRedisCacheConfHash;
      const columns = Object.entries(values)
        .map(([k, v]) => `${k} = ${this.db.escape(v)}`)
        .join(",");
      const sql = `update ${conf.table} set ${columns} where ${conf.key} = ${this.db.escape(key)}`;
      const r = await con.rawCommand(sql);
      const fieldValues = Object.entries(values).reduce((prev: any[], cur: any[]) => [...cur, ...prev], []);
      await this.redis.hmset(conf.keyPrefix + key, ...fieldValues);
      await con.commit();
      return r;
    });
  }

  getHashAll(name: string, key: string) {
    return this.redis.hgetall(this.cacheConf[name].keyPrefix + key);
  }

  disconnect() {
    this.db.release();
    this.redis.dc();
  }
}
