import type { EntityName } from './entityName.js';
import type { EntityNode } from './entityNode.js';
import type { ArgNode, TypeNode } from './typeNode.js';

export type MutationType = 'create' | 'delete' | 'update';

export type ContextField = {
  fieldName: string;
  contextName: string;
};

export type MutationNode = {
  entity: EntityNode;
  mutationName: string;
  inputName: string;
  identifyFields: string[];
  entityName: EntityName;
  returnType: TypeNode;
  args: ArgNode[];
  mutationType: MutationType;
  subscription: boolean;
  refetch: boolean;
  contextFields: ContextField[];
  requireIdDecodeMiddleware: boolean;
  middlewares: string[];
};
