import { PubSub, type PubSubEngine } from "graphql-subscriptions";
import { Redis } from "ioredis";
import { parsePubSubPayload, serializePubSubPayload } from "./pubSubPayload.js";

export type PubSubOptions = {
  backend?: "local" | "redis";
  redisUrl?: string;
  channelPrefix?: string;
};

export interface ConfiguredPubSub extends PubSubEngine {
  subscribe(
    trigger: string,
    onMessage: (message: unknown) => void,
    options?: object,
  ): Promise<number>;
  close(): Promise<void>;
}

class LocalPubSub extends PubSub {
  async close(): Promise<void> {
    this.ee.removeAllListeners();
  }
}

class SharedRedisPubSub extends PubSub<Record<string, unknown>> {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly channels = new Map<number, string>();

  constructor(
    url: string,
    private readonly prefix: string,
  ) {
    super();
    const options = {
      // Preserve the existing wire protocol when upgrading to ioredis 6.
      protocol: 2 as const,
      lazyConnect: true,
      connectTimeout: 5_000,
      commandTimeout: 5_000,
      maxRetriesPerRequest: 1,
    };
    this.publisher = new Redis(url, options);
    this.subscriber = new Redis(url, options);
    for (const client of [this.publisher, this.subscriber]) {
      // Do not log connection URLs or credentials. Commands still reject on failure.
      client.on("error", () => console.error("Redis PubSub connection error"));
    }
    this.subscriber.on("message", (channel: string, message: string) => {
      let payload: unknown;
      try {
        payload = parsePubSubPayload(message);
      } catch {
        console.error("Redis PubSub received invalid JSON");
        return;
      }
      void super.publish(channel, payload);
    });
  }

  override async publish(trigger: string, payload: unknown): Promise<void> {
    await this.publisher.publish(
      this.prefix + trigger,
      serializePubSubPayload(payload),
    );
  }

  override async subscribe(
    trigger: string,
    onMessage: (message: unknown) => void,
  ): Promise<number> {
    const channel = this.prefix + trigger;
    const id = await super.subscribe(channel, onMessage);
    this.channels.set(id, channel);
    try {
      // Redis SUBSCRIBE is idempotent. Await its acknowledgement before returning
      // an ID so callers can safely publish once subscription setup completes.
      await this.subscriber.subscribe(channel);
      return id;
    } catch (error) {
      this.unsubscribe(id);
      throw error;
    }
  }

  override unsubscribe(id: number): void {
    const channel = this.channels.get(id);
    if (channel === undefined) return;
    super.unsubscribe(id);
    this.channels.delete(id);
    if (![...this.channels.values()].includes(channel)) {
      void this.subscriber.unsubscribe(channel).catch(() => {
        console.error("Redis PubSub unsubscribe failed");
      });
    }
  }

  async close(): Promise<void> {
    // Disconnect also works before first use and while Redis is unavailable.
    this.publisher.disconnect();
    this.subscriber.disconnect();
    this.channels.clear();
    this.ee.removeAllListeners();
  }
}

/** Defaults to local PubSub. Redis connections are opened lazily on first use. */
export function createPubSub(options: PubSubOptions = {}): ConfiguredPubSub {
  const backend = options.backend ?? process.env.PUBSUB_BACKEND ?? "local";
  if (backend === "local") return new LocalPubSub();
  if (backend !== "redis") {
    throw new Error("PUBSUB_BACKEND must be local or redis");
  }
  const url = options.redisUrl ?? process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for Redis PubSub");
  try {
    const parsed = new URL(url);
    if (!["redis:", "rediss:"].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error();
    }
  } catch {
    throw new Error("REDIS_URL must be a valid redis:// or rediss:// URL");
  }
  return new SharedRedisPubSub(
    url,
    options.channelPrefix ?? process.env.PUBSUB_PREFIX ?? "sasat:",
  );
}
