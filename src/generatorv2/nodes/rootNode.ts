import { EntityNode } from './entityNode.js';
import { QueryNode } from './queryNode.js';
import { MutationNode } from './mutationNode.js';

export type RootNode = {
  entities: EntityNode[];
  queries: QueryNode[];
  mutations: MutationNode[];
};
