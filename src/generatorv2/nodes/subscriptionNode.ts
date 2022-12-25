import { ArgNode, TypeNode } from './typeNode.js';

type MutationType = 'create' | 'delete' | 'update';

export type SubscriptionNode = {
  gqlEnabled: boolean;
  subscriptionName: string;
  returnType: TypeNode;
  args: ArgNode[];
  mutationType: MutationType;
};
