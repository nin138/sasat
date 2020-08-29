import { MutationNode } from '../../node/gql/mutationNode';
import { ContextNode } from '../../node/gql/contextNode';
import { ResolverNode } from '../../node/gql/resolverNode';
import { QueryNode } from '../../node/gql/queryNode';
import { TypeDefNode } from '../../node/gql/typeDefNode';

export interface IrGql {
  types: TypeDefNode[];
  queries: QueryNode[];
  mutations: MutationNode[];
  contexts: ContextNode[];
  resolvers: ResolverNode[];
}
