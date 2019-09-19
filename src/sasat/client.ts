import { DBClient, SQLClient, SQLTransaction } from "../db/dbClient";
import { RedisClient } from "../redis/redisClient";

import { initCache } from "./initCache";
import {
  SasatRedisCacheConfHash,
  SasatRedisCacheConfJSONString,
  SasatRedisCacheConfString,
  SasatRedisCacheType,
} from "./redisCacheConf";
import { getDbClient } from "../db/getDbClient";
import { config } from "../config/config";

type Key = string | number;

export class SasatClient {
  private static flatFV(values: { [key: string]: any }) {
    return Object.entries(values).reduce((prev: any[], cur: any[]) => [...cur, ...prev], []);
  }
  readonly cacheConf: { [name: string]: SasatRedisCacheType } = {};
  readonly db: DBClient;
  readonly redis: RedisClient;
  private readonly config = config();
  constructor() {
    this.db = getDbClient();
    this.redis = new RedisClient(this.config.redis.host, this.config.redis.port, this.config.redis.password);

    this.config.initCaches.forEach(it => {
      this.cacheConf[it.name] = it;
    });
  }

  init(): Promise<any> {
    return initCache(this.db, this.redis, this.config.initCaches);
  }

  getString(name: string, key: Key) {
    return this.redis.get(this.cacheConf[name].keyPrefix + key);
  }

  setString(name: string, key: Key, value: any) {
    const conf = this.cacheConf[name] as SasatRedisCacheConfString;
    return this.redis.set(conf.keyPrefix + key, value);
  }

  updateString(name: string, key: Key, value: any) {
    return this.db.transaction().then(async con => {
      const conf = this.cacheConf[name] as SasatRedisCacheConfString;
      const r = await con.rawQuery(
        `update ${conf.table} set ${conf.value} = ${SQLClient.escape(value)} where ${conf.key} = ${SQLClient.escape(
          key,
        )}`,
      );
      await this.redis.set(conf.keyPrefix + key, value);
      await con.commit();
      return r;
    });
  }

  getJSONString(name: string, key: Key): Promise<{ [key: string]: any } | null> {
    return this.redis.get(this.cacheConf[name].keyPrefix + key).then(it => (it ? JSON.parse(it) : null));
  }

  setJSONString(name: string, key: Key, values: { [key: string]: any }) {
    const conf = this.cacheConf[name] as SasatRedisCacheConfJSONString;
    return this.redis.set(conf.keyPrefix + key, JSON.stringify(values));
  }

  insertJSONStringWithDb(name: string, values: { [key: string]: any }) {
    const conf = this.cacheConf[name] as SasatRedisCacheConfJSONString;
    return this.db.transaction().then(async con => {
      const r = await this.insertToDb(con, conf.table, values);
      if (conf.isKeyAutoIncrement) values[conf.key] = r.insertId;
      await this.redis.set(conf.keyPrefix + values[conf.key], JSON.stringify(values));
      await con.commit();
      return r;
    });
  }

  updateJSONString(name: string, key: Key, values: { [key: string]: any }) {
    return this.db.transaction().then(async con => {
      const conf = this.cacheConf[name] as SasatRedisCacheConfJSONString;
      const columns = Object.entries(values)
        .map(([k, v]) => `${k} = ${SQLClient.escape(v)}`)
        .join(",");
      const r = await con.rawQuery(`update ${conf.table} set ${columns} where ${conf.key} = ${SQLClient.escape(key)}`);
      await this.redis.set(conf.keyPrefix + key, JSON.stringify(values));
      await con.commit();
      return r;
    });
  }

  getHash(name: string, key: Key, column: string): Promise<string | null> {
    return this.redis.hget(this.cacheConf[name].keyPrefix + key, column);
  }

  getHashAll(name: string, key: Key) {
    return this.redis.hgetall(this.cacheConf[name].keyPrefix + key);
  }

  setHash(name: string, key: Key, values: { [key: string]: any }) {
    const conf = this.cacheConf[name] as SasatRedisCacheConfHash;
    return this.redis.hmset(conf.keyPrefix + key, ...SasatClient.flatFV(values));
  }

  insertHashWithDb(name: string, values: { [key: string]: any }) {
    const conf = this.cacheConf[name] as SasatRedisCacheConfHash;
    return this.db.transaction().then(async con => {
      const r = await this.insertToDb(con, conf.table, values);
      if (conf.isKeyAutoIncrement) values[conf.key] = r.insertId;
      await this.redis.hmset(conf.keyPrefix + values[conf.key], ...SasatClient.flatFV(values));
      await con.commit();
      return r;
    });
  }

  updateHash(name: string, key: Key, values: { [key: string]: any }) {
    return this.db.transaction().then(async con => {
      const conf = this.cacheConf[name] as SasatRedisCacheConfHash;
      const columns = Object.entries(values)
        .map(([k, v]) => `${k} = ${SQLClient.escape(v)}`)
        .join(",");
      const r = await con.rawQuery(`update ${conf.table} set ${columns} where ${conf.key} = ${SQLClient.escape(key)}`);
      await this.redis.hmset(conf.keyPrefix + key, ...SasatClient.flatFV(values));
      await con.commit();
      return r;
    });
  }

  disconnect() {
    this.db.release();
    this.redis.dc();
  }

  private insertToDb(transaction: SQLTransaction, table: string, values: { [key: string]: any }) {
    const columns: string[] = [];
    const vals: any[] = [];
    Object.entries(values).map(([k, v]) => {
      columns.push(k);
      vals.push(SQLClient.escape(v));
    });
    return transaction.rawQuery(`insert into ${table}(${columns.join(",")}) values(${vals.join(",")})`);
  }
}
