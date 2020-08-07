import { SubscriptionFilterNode } from './subscriptionFilterNode';

export class SubscriptionNode {
  constructor(readonly filters: SubscriptionFilterNode[]) {}
}
