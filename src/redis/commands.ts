import * as redis from 'redis';
import { Callback } from 'redis';
import { Redis } from './redis';
import OK = Redis.OK;
import MINMAX = Redis.MINMAX;
import Aggregate = Redis.Aggregate;
import NXReply = Redis.NXReply;
import SADDReply = Redis.SADDReply;
import REMReply = Redis.REMReply;
import ZADDReply = Redis.ZADDReply;
import HSETReply = Redis.HSETReply;

/*eslint @typescript-eslint/no-explicit-any: 0*/

export abstract class Commands {
  abstract readonly client: redis.RedisClient | redis.Multi;
  private readonly WITHSOCORES = 'WITHSOCORES';

  select(db: number): Promise<OK> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.promisify((cb: any) => this.client.select(db, cb));
  }

  move(key: string, db: number): Promise<boolean> {
    return this.promisify(cb =>
      (this.client.move as (key: string, db: number, callback: Callback<number>) => void)(key, db, cb),
    ).then(it => it === 1);
  }

  flashdb(): Promise<string> {
    return this.promisify(cb => this.client.flushdb(cb));
  }

  flashall(): Promise<string> {
    return this.promisify(cb => this.client.flushall(cb));
  }

  // transaction
  // promisify
  // discard
  // watch

  // command
  exists(...keys: string[]): Promise<number> {
    return this.promisify(cb => (this.client.exists as any)(...keys, cb));
  }

  del(...keys: string[]): Promise<number> {
    return this.promisify(cb => (this.client.del as any)(...keys, cb));
  }

  type(key: string): Promise<Redis.Type | 'none'> {
    return this.promisify((cb: any) => this.client.type(key, cb));
  }

  keys(pattern: string): Promise<string[]> {
    return this.promisify(cb => this.client.keys(pattern, cb));
  }

  randomkey(): Promise<string | null> {
    return this.promisify(cb => this.client.randomkey(cb));
  }

  rename(key: string, newKey: string): Promise<OK> {
    return this.promisify(cb => this.client.rename(key, newKey, cb));
  }

  renamenx(key: string, newKey: string): Promise<NXReply> {
    return this.promisify(cb => this.client.renamenx(key, newKey, cb));
  }

  dbsize(): Promise<number> {
    return this.promisify(cb => this.client.dbsize(cb));
  }

  expire(key: string, second: number): Promise<boolean> {
    return this.promisify(cb => this.client.expire(key, second, cb)).then(it => it === 1);
  }

  expireat(key: string, unixTime: number): Promise<boolean> {
    return this.promisify(cb => this.client.expireat(key, unixTime, cb)).then(it => it === 1);
  }

  persist(key: string): Promise<boolean> {
    return this.promisify(cb => this.client.persist(key, cb)).then(it => it === 1);
  }

  ttl(key: string): Promise<number> {
    return this.promisify(cb => this.client.ttl(key, cb));
  }

  // string
  set(key: string, value: string): Promise<OK> {
    return this.promisify(cb => this.client.set(key, value, cb));
  }

  get(key: string): Promise<string | null> {
    return this.promisify(cb => this.client.get(key, cb));
  }

  getset(key: string, value: string): Promise<string | null> {
    return this.promisify(cb => this.client.getset(key, value, cb));
  }

  // mult get
  mget(...keys: string[]): Promise<Array<string | null>> {
    return this.promisify(cb => (this.client.mget as any)(...keys, cb));
  }

  // set not exist
  setnx(key: string, value: string): Promise<NXReply> {
    return this.promisify(cb => this.client.setnx(key, value, cb));
  }

  // set + expire
  setex(key: string, seconds: number, value: string): Promise<OK> {
    return this.promisify((cb: Callback<any>) => this.client.setex(key, seconds, value, cb));
  }

  // mult set
  mset(...keyValues: string[]): Promise<OK> {
    return this.promisify((cb: Callback<any>) => (this.client.mset as any)(...keyValues, cb));
  }

  // mult set if not exist
  // 1 if the all the keys were set.
  // 0 if no key was set (at least one key already existed).
  msetnx(...keyValues: string[]): Promise<NXReply> {
    return this.promisify((cb: Callback<any>) => (this.client.msetnx as any)(...keyValues, cb));
  }

  // increment
  incr(key: string): Promise<number> {
    return this.promisify(cb => this.client.incr(key, cb));
  }

  // increment by
  incrby(key: string, increment: number): Promise<number> {
    return this.promisify(cb => this.client.incrby(key, increment, cb));
  }

  // decrement
  decr(key: string): Promise<number> {
    return this.promisify(cb => this.client.decr(key, cb));
  }

  // decrement by
  decrby(key: string, decrement: number): Promise<number> {
    return this.promisify(cb => this.client.decrby(key, decrement, cb));
  }

  // return strlen
  append(key: string, value: string): Promise<number> {
    return this.promisify(cb => this.client.append(key, value, cb));
  }

  getrange(key: string, start: number, end: number): Promise<string> {
    return this.promisify(cb => this.client.getrange(key, start, end, cb));
  }

  substr(key: string, start: number, end: number): Promise<string> {
    return this.getrange(key, start, end);
  }

  // List

  // return element count
  rpush(key: string, ...values: string[]): Promise<number> {
    return this.promisify(cb => this.client.rpush(key, ...values, cb));
  }

  lpush(key: string, ...values: string[]): Promise<number> {
    return this.promisify(cb => this.client.lpush(key, values, cb));
  }

  llen(key: string): Promise<number> {
    return this.promisify(cb => this.client.llen(key, cb));
  }

  lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.promisify(cb => this.client.lrange(key, start, stop, cb));
  }

  ltrim(key: string, start: number, stop: number): Promise<OK> {
    return this.promisify(cb => this.client.ltrim(key, start, stop, cb));
  }

  lindex(key: string, index: number): Promise<string | null> {
    return this.promisify(cb => this.client.lindex(key, index, cb));
  }

  lset(key: string, index: number, value: string): Promise<OK> {
    return this.promisify(cb => this.client.lset(key, index, value, cb));
  }

  lrem(key: string, count: number, value: string): Promise<number> {
    return this.promisify(cb => this.client.lrem(key, count, value, cb));
  }

  lpop(key: string): Promise<string | null> {
    return this.promisify(cb => this.client.lpop(key, cb));
  }

  rpop(key: string): Promise<string | null> {
    return this.promisify(cb => this.client.rpop(key, cb));
  }

  // !block   return [key, value]
  blpop(keys: string[], timeout: number): Promise<[string, string] | null> {
    return this.promisify(cb => this.client.blpop(...keys, timeout, cb));
  }

  brpop(keys: string[], timeout: number): Promise<[string, string] | null> {
    return this.promisify(cb => this.client.brpop(...keys, timeout, cb));
  }

  rpoplpush(source: string, destination: string): Promise<string | null> {
    return this.promisify(cb => this.client.rpoplpush(source, destination, cb));
  }

  // set
  sadd(key: string, member: string): Promise<SADDReply> {
    return this.promisify(cb => this.client.sadd(key, member, cb));
  }

  srem(key: string, member: string): Promise<REMReply> {
    return this.promisify(cb => this.client.srem(key, member, cb));
  }

  spop(key: string): Promise<string | null> {
    return this.promisify(cb => this.client.spop(key, cb));
  }

  smove(source: string, destination: string, member: string): Promise<boolean> {
    return this.promisify((cb: redis.Callback<number>) => this.client.smove(source, destination, member, cb)).then(
      (it: any) => it === 1,
    );
  }

  // the cardinality (number of elements) of the set as an integer.
  scard(key: string): Promise<number> {
    return this.promisify(cb => this.client.scard(key, cb));
  }

  // set is member
  sismember(key: string, member: string): Promise<boolean> {
    return this.promisify(cb => this.client.sismember(key, member, cb)).then(it => it === 1);
  }

  smembers(key: string): Promise<string[]> {
    return this.promisify(cb => this.client.smembers(key, cb));
  }

  sinter(...keys: string[]): Promise<string[]> {
    return this.promisify(cb => this.client.sinter(...keys, cb));
  }

  // return the number of elements in the resulting set.
  sinterstore(destination: string, ...keys: string[]): Promise<number> {
    return this.promisify(cb => this.client.sinterstore(destination, ...keys, cb));
  }

  sunion(...keys: string[]): Promise<string[]> {
    return this.promisify(cb => this.client.sunion(...keys, cb));
  }

  // return the number of elements in the resulting set.
  sunionstore(destination: string, ...keys: string[]): Promise<number> {
    return this.promisify(cb => this.client.sunionstore(destination, ...keys, cb));
  }

  sdiff(...keys: string[]): Promise<string[]> {
    return this.promisify(cb => this.client.sdiff(...keys, cb));
  }

  sdiffstore(destination: string, ...keys: string[]): Promise<number> {
    return this.promisify(cb => this.client.sdiffstore(destination, ...keys, cb));
  }

  // if count is positive value distinct elements
  // if count is negative return the same element multiple times.
  srandmember(key: string, count: undefined): Promise<string | null>;
  srandmember(key: string, count: number): Promise<string[]>;
  srandmember(key: string, count: number | undefined): Promise<string | null | string[]> {
    if (count !== undefined) return this.promisify(cb => this.client.srandmember(key, count, cb));
    return this.promisify(cb => this.client.srandmember(key, cb));
  }

  // sorted set

  zadd(key: string, score: number, member: string): Promise<ZADDReply> {
    return this.promisify(cb => this.client.zadd(key, score, member, cb));
  }

  zrem(key: string, member: string): Promise<REMReply> {
    return this.promisify(cb => this.client.zrem(key, member, cb));
  }

  zincrby(key: string, increment: number, member: string): Promise<number | string> {
    return this.promisify(cb => this.client.zincrby(key, increment, member, cb));
  }

  // return sorted rank of member
  zrank(key: string, member: string): Promise<number | null> {
    return this.promisify((cb: any) => this.client.zrank(key, member, cb));
  }

  zrevrank(key: string, member: string): Promise<number | null> {
    return this.promisify((cb: any) => this.client.zrevrank(key, member, cb));
  }

  zrange(key: string, start: number, stop: number, withScore = false): Promise<string[]> {
    if (withScore) return this.promisify(cb => this.client.zrange(key, start, stop, this.WITHSOCORES, cb));
    return this.promisify(cb => this.client.zrange(key, start, stop, cb));
  }

  zrevrenge(key: string, start: number, stop: number, withScore = false): Promise<string[]> {
    if (withScore) return this.promisify(cb => this.client.zrevrange(key, start, stop, this.WITHSOCORES, cb));
    return this.promisify(cb => this.client.zrevrange(key, start, stop, cb));
  }

  zrangebyscore(key: string, min: number, max: number, withScore = false): Promise<string[]> {
    if (withScore) return this.promisify(cb => this.client.zrangebyscore(key, min, max, this.WITHSOCORES, cb));
    return this.promisify(cb => this.client.zrangebyscore(key, min, max, cb));
  }

  zrangebylex(key: string, min: string, max: string): Promise<string[]> {
    return this.promisify(cb => this.client.zrangebylex(key, min, max, cb));
  }

  zcount(key: string, min: number | MINMAX, max: number | MINMAX): Promise<number> {
    return this.promisify(cb => this.client.zcount(key, min, max, cb));
  }

  zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    return this.promisify(cb => this.client.zremrangebyrank(key, start, stop, cb));
  }

  zremrangebyscore(key: string, start: number | MINMAX, stop: number | MINMAX): Promise<number> {
    return this.promisify(cb => this.client.zremrangebyscore(key, start, stop, cb));
  }

  zremrangebylex(key: string, min: string, max: string): Promise<number> {
    return this.promisify(cb => this.client.zremrangebylex(key, min, max, cb));
  }

  // return the cardinality (number of elements) of the set as an integer.
  zcard(key: string): Promise<number> {
    return this.promisify(cb => this.client.zcard(key, cb));
  }

  zscore(key: string, member: string): Promise<string | null> {
    return this.promisify(cb => this.client.zscore(key, member, cb));
  }

  zunionstore(
    destination: string,
    keys: string[],
    weights: number[] | undefined,
    aggregate: Aggregate | undefined,
  ): Promise<number> {
    const args = [destination, keys.length, ...keys];
    if (weights) args.push('WEIGHTS', ...weights);
    if (aggregate) args.push('AGGREGATE', aggregate);
    return this.promisify(cb => this.client.zunionstore(...args, cb));
  }

  zinterstore(
    destination: string,
    keys: string[],
    weights: number[] | undefined,
    aggregate: Aggregate | undefined,
  ): Promise<number> {
    const args = [destination, keys.length, ...keys];
    if (weights) args.push('WEIGHTS', ...weights);
    if (aggregate) args.push('AGGREGATE', aggregate);
    return this.promisify(cb => this.client.zinterstore(...args, cb));
  }

  // Hash

  hset(key: string, field: string, value: string): Promise<HSETReply> {
    return this.promisify(cb => this.client.hset(key, field, value, cb));
  }

  hget(key: string, field: string): Promise<string> {
    return this.promisify(cb => this.client.hget(key, field, cb));
  }

  hsetnx(key: string, field: string, value: string): Promise<NXReply> {
    return this.promisify(cb => this.client.hsetnx(key, field, value, cb));
  }

  hmset(key: string, ...fieldAndValues: string[]): Promise<OK> {
    return this.promisify((cb: Callback<any>) => this.client.hmset(key, ...fieldAndValues, cb));
  }

  hmget(key: string, ...fields: string[]): Promise<Array<string | null>> {
    return this.promisify(cb => this.client.hmget(key, ...fields, cb));
  }

  hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.promisify(cb => this.client.hincrby(key, field, increment, cb));
  }

  hexists(key: string, field: string): Promise<boolean> {
    return this.promisify(cb => this.client.hexists(key, field, cb)).then(it => it === 1);
  }

  hdel(key: string, field: string): Promise<boolean> {
    return this.promisify(cb => this.client.hdel(key, field, cb)).then(it => it === 1);
  }

  hkeys(key: string): Promise<string[]> {
    return this.promisify(cb => this.client.hkeys(key, cb));
  }

  hvals(key: string): Promise<string[]> {
    return this.promisify(cb => this.client.hvals(key, cb));
  }

  hgetall(key: string): Promise<{ [key: string]: string }> {
    return this.promisify(cb => this.client.hgetall(key, cb));
  }

  protected promisify<T>(fn: (cb: Callback<T>) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      fn((err: Error | null, reply: T) => {
        if (err) reject(err);
        resolve(reply);
      });
    });
  }
}
