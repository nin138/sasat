import { ArgNode, TypeNode } from './typeNode.js';

export type MutationType = 'create' | 'delete' | 'update';

export type MutationNode = {
  mutationName: string;
  returnType: TypeNode;
  args: ArgNode[];
  mutationType: MutationType;
  enableSubscription: boolean;
  refetch: boolean;
};
