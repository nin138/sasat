import {
  SassatRedisCacheConfHash,
  SassatRedisCacheConfJSONString,
  SassatRedisCacheConfString,
  RedisDBCacheTypeNames,
  SassatRedisCacheType,
} from "./redisCacheConf";
import { DBClient } from "../db/dbClient";
import { RedisClient } from "../redis/redisClient";

export const initCache = async (
  db: DBClient,
  redis: RedisClient,
  initCachesInfo: SassatRedisCacheType[],
): Promise<Array<"OK">> => {
  const stringCache = (
    conf: SassatRedisCacheConfString,
    records: Array<{ [key: string]: any }>,
  ): Promise<Array<"OK">> =>
    Promise.all(records.map(record => redis.set(`${conf.keyPrefix}${record[conf.key]}`, record[conf.value])));

  const jsonCache = (
    conf: SassatRedisCacheConfJSONString,
    records: Array<{ [key: string]: any }>,
  ): Promise<Array<"OK">> =>
    Promise.all(records.map(record => redis.set("" + conf.keyPrefix + record[conf.key], JSON.stringify(record))));

  const hashCache = (conf: SassatRedisCacheConfHash, records: Array<{ [key: string]: any }>): Promise<Array<"OK">> =>
    Promise.all(
      records.map(record => {
        const fieldValues = Object.entries(record).reduce((prev: any[], cur: any[]) => [...cur, ...prev], []);
        return redis.hmset("" + conf.keyPrefix + record[conf.key], ...fieldValues);
      }),
    );

  return Promise.all(
    initCachesInfo.map(
      (it: SassatRedisCacheType): Promise<any> => {
        const columns = it.type === RedisDBCacheTypeNames.String ? [it.value] : it.values;
        return db.query`select ${() => [it.key, ...columns].join(",")} from ${() => it.table}`.then(res => {
          if (it.type === RedisDBCacheTypeNames.String) return stringCache(it, res);
          if (it.type === RedisDBCacheTypeNames.JSONString) return jsonCache(it, res);
          if (it.type === RedisDBCacheTypeNames.Hash) return hashCache(it, res);
          throw new Error(`incorrect type ${(it as any).type}`);
        });
      },
    ),
  );
};
