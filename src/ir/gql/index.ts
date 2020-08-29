import { MutationNode } from '../../node/gql/mutationNode';
import { ContextNode } from '../../node/gql/contextNode';
import { ResolverNode } from '../../node/gql/resolverNode';
import { QueryNode } from '../../node/gql/queryNode';

export interface IrGql {
  queries: QueryNode[];
  mutations: MutationNode[];
  contexts: ContextNode[];
  resolvers: ResolverNode[];
}
