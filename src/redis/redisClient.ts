import * as redis from 'redis';
import { Commands } from './commands';
import { Redis } from './redis';
import OK = Redis.OK;

export class Multi extends Commands {
  readonly client: redis.Multi;
  constructor(multi: redis.Multi) {
    super();
    this.client = multi;
  }
  watch(...keys: string[]): Promise<OK> {
    return this.promisify(cb => this.client.watch(...keys, cb));
  }
  unwatch(): Promise<OK> {
    return this.promisify(cb => this.client.unwatch(cb));
  }
  discard(): Promise<OK> {
    return this.promisify(cb => this.client.discard(cb));
  }
  exec(): Promise<any[]> {
    return this.promisify(cb => this.client.exec(cb));
  }
}

export class RedisClient extends Commands {
  readonly client: redis.RedisClient;
  constructor(host: string, port = 6379, password?: string) {
    super();
    this.client = redis.createClient(port, host, { password });
  }
  multi() {
    return new Multi(this.client.multi());
  }
  dc(flush = false) {
    this.client.end(flush);
  }
}
