import { IrGqlType } from './types';
import { MutationNode } from '../../node/gql/mutationNode';
import { ContextNode } from '../../node/gql/contextNode';
import { ResolverNode } from '../../node/gql/resolverNode';
import { QueryNode } from '../../node/gql/queryNode';

export interface IrGql {
  types: IrGqlType[];
  queries: QueryNode[];
  mutations: MutationNode[];
  contexts: ContextNode[];
  resolvers: ResolverNode[];
}
