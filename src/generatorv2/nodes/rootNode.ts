import { EntityNode } from './entityNode.js';
import { SubscriptionNode } from './subscriptionNode.js';
import { ContextNode } from './contextNode.js';

export type RootNode = {
  entities: EntityNode[];
  subscriptions: SubscriptionNode[];
  contexts: ContextNode[];
};
