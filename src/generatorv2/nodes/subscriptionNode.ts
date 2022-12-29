import { ArgNode, TypeNode } from './typeNode.js';
import { GqlPrimitive } from '../../generator/gql/types.js';
import { EntityName } from '../../parser/node/entityName.js';

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
  gqlType: GqlPrimitive;
};
