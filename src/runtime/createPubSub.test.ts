import { PubSub } from "graphql-subscriptions";
import { Redis } from "ioredis";
import { createPubSub } from "./createPubSub.js";

beforeEach(() => {
  jest.replaceProperty(process, "env", { ...process.env });
  delete process.env.PUBSUB_BACKEND;
  delete process.env.REDIS_URL;
  delete process.env.PUBSUB_PREFIX;
});

test("defaults to local delivery and unsubscribes without a Redis connection", async () => {
  process.env.REDIS_URL = "invalid and unused in local mode";
  const pubsub = createPubSub();
  expect(pubsub).toBeInstanceOf(PubSub);
  const receive = jest.fn();
  const id = await pubsub.subscribe("UserCreated", receive, {});
  await pubsub.publish("UserCreated", { userId: 1 });
  expect(receive).toHaveBeenCalledWith({ userId: 1 });
  pubsub.unsubscribe(id);
  await pubsub.publish("UserCreated", { userId: 2 });
  expect(receive).toHaveBeenCalledTimes(1);
  await pubsub.close();
});

test("local instances do not share events", async () => {
  const first = createPubSub();
  const second = createPubSub();
  const receive = jest.fn();
  await second.subscribe("UserCreated", receive, {});
  await first.publish("UserCreated", { userId: 1 });
  expect(receive).not.toHaveBeenCalled();
  await Promise.all([first.close(), second.close()]);
});

test("explicit options override environment selection", async () => {
  process.env.PUBSUB_BACKEND = "redis";
  const local = createPubSub({ backend: "local" });
  expect(local).toBeInstanceOf(PubSub);
  const redis = createPubSub({ redisUrl: "rediss://localhost:6379" });
  // Redis is lazy: constructing and closing it must not require a running server.
  await Promise.all([local.close(), redis.close()]);
});

test("rejects an unknown backend instead of silently using local delivery", () => {
  process.env.PUBSUB_BACKEND = "redsi";
  expect(() => createPubSub()).toThrow("PUBSUB_BACKEND must be local or redis");
});

test("requires a Redis URL when Redis is selected", () => {
  process.env.PUBSUB_BACKEND = "redis";
  expect(() => createPubSub()).toThrow("REDIS_URL is required");
});

test("Redis publishes JSON payloads to the configured namespace", async () => {
  process.env.PUBSUB_BACKEND = "redis";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.PUBSUB_PREFIX = "application:test:";
  const publish = jest.spyOn(Redis.prototype, "publish").mockResolvedValue(1);
  const pubsub = createPubSub();
  try {
    await pubsub.publish("UserCreated", { userId: 1, name: "Alice" });
    expect((publish.mock.contexts[0] as Redis).options.protocol).toBe(2);
    expect(publish).toHaveBeenCalledWith(
      "application:test:UserCreated",
      JSON.stringify({ userId: 1, name: "Alice" }),
    );
  } finally {
    await pubsub.close();
  }
});

test("Redis publish failures reach the caller instead of falling back to local", async () => {
  const error = new Error("Redis unavailable");
  jest.spyOn(Redis.prototype, "publish").mockRejectedValue(error);
  const pubsub = createPubSub({
    backend: "redis",
    redisUrl: "redis://localhost:6379",
  });
  try {
    await expect(pubsub.publish("UserCreated", { userId: 1 })).rejects.toBe(
      error,
    );
  } finally {
    await pubsub.close();
  }
});

test("Redis fans out messages and keeps a channel until its last subscriber leaves", async () => {
  const subscribe = jest
    .spyOn(Redis.prototype, "subscribe")
    .mockResolvedValue(1);
  const unsubscribe = jest
    .spyOn(Redis.prototype, "unsubscribe")
    .mockResolvedValue(0);
  const pubsub = createPubSub({
    backend: "redis",
    redisUrl: "redis://localhost:6379",
    channelPrefix: "test:",
  });
  const first = jest.fn();
  const second = jest.fn();
  try {
    const firstId = await pubsub.subscribe("UserCreated", first);
    const secondId = await pubsub.subscribe("UserCreated", second);
    expect(subscribe).toHaveBeenCalledWith("test:UserCreated");
    const subscriber = subscribe.mock.contexts[0] as Redis;
    expect(subscriber.options.protocol).toBe(2);
    subscriber.emit("message", "test:UserCreated", '{"userId":1}');
    expect(first).toHaveBeenCalledWith({ userId: 1 });
    expect(second).toHaveBeenCalledWith({ userId: 1 });
    pubsub.unsubscribe(firstId);
    expect(unsubscribe).not.toHaveBeenCalled();
    subscriber.emit("message", "test:UserCreated", '{"userId":2}');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenLastCalledWith({ userId: 2 });
    pubsub.unsubscribe(secondId);
    expect(unsubscribe).toHaveBeenCalledWith("test:UserCreated");
  } finally {
    await pubsub.close();
  }
});

test("a rejected Redis subscription removes its local listener and permits retry", async () => {
  const error = new Error("Redis unavailable");
  const subscribe = jest
    .spyOn(Redis.prototype, "subscribe")
    .mockRejectedValueOnce(error)
    .mockResolvedValue(1);
  jest.spyOn(Redis.prototype, "unsubscribe").mockResolvedValue(0);
  const pubsub = createPubSub({
    backend: "redis",
    redisUrl: "redis://localhost:6379",
  });
  const failed = jest.fn();
  const retried = jest.fn();
  try {
    await expect(pubsub.subscribe("event", failed)).rejects.toBe(error);
    await pubsub.subscribe("event", retried);
    const subscriber = subscribe.mock.contexts[0] as Redis;
    subscriber.emit("message", "sasat:event", '{"ok":true}');
    expect(failed).not.toHaveBeenCalled();
    expect(retried).toHaveBeenCalledWith({ ok: true });
  } finally {
    await pubsub.close();
  }
});

test.each(["invalid", "https://localhost", "redis://", "redis://user:secret@"])(
  "rejects invalid Redis URL %s without exposing its contents",
  (redisUrl) => {
    expect(() => createPubSub({ backend: "redis", redisUrl })).toThrow(
      "REDIS_URL must be a valid redis:// or rediss:// URL",
    );
  },
);
