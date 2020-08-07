import { SubscriptionFilterNode } from './subscriptionFilterNode';

export class SubscriptionNode {
  constructor(
    readonly onCreate: boolean,
    readonly onUpdate: boolean,
    readonly onDelete: boolean,
    readonly filters: SubscriptionFilterNode[],
  ) {}
}
