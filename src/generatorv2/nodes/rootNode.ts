import type { ContextNode } from "./contextNode.js";
import type { EntityNode } from "./entityNode.js";
import type { SubscriptionNode } from "./subscriptionNode.js";

export type RootNode = {
  entities: EntityNode[];
  subscriptions: SubscriptionNode[];
  contexts: ContextNode[];
};
