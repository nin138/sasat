import { ContextNode } from './contextNode.js';
import { EntityNode } from './entityNode.js';
import { SubscriptionNode } from './subscriptionNode.js';

export type RootNode = {
  entities: EntityNode[];
  subscriptions: SubscriptionNode[];
  contexts: ContextNode[];
};
