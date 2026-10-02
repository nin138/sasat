// Observe the actual PubSub lifecycle via IPC without adding HTTP test endpoints.
import { pubsub } from "../out/pubsub.js";

const active = new Set<number>();
const subscribe = pubsub.subscribe.bind(pubsub);
const unsubscribe = pubsub.unsubscribe.bind(pubsub);
const report = () =>
  process.send?.({ type: "subscriptions", count: active.size });

pubsub.subscribe = async (...args) => {
  const id = await subscribe(...args);
  active.add(id);
  report();
  return id;
};
pubsub.unsubscribe = (id) => {
  unsubscribe(id);
  active.delete(id);
  report();
};

await import("../yogaServer.js");
