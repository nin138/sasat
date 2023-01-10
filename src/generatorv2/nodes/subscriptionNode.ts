import { ArgNode, TypeNode } from './typeNode.js';
import { EntityName } from './entityName.js';
import { GQLPrimitive } from '../scripts/gqlTypes.js';

type MutationType = 'create' | 'delete' | 'update';

// TODO remove duplicate args, filters
export type SubscriptionNode = {
  gqlEnabled: boolean;
  subscriptionName: string;
  publishFunctionName: string;
  returnType: TypeNode;
  args: ArgNode[];
  mutationType: MutationType;
  entity: EntityName;
  filters: SubscriptionFilterNode[];
};

export type SubscriptionFilterNode = {
  field: string;
  gqlType: GQLPrimitive;
};
