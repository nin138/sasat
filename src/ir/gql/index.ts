import { IrGqlType } from './types';
import { IrGqlQuery } from './query';
import { MutationNode } from '../../node/gql/mutationNode';
import { ContextNode } from '../../node/gql/contextNode';
import { ResolverNode } from '../../node/gql/resolverNode';

export interface IrGql {
  types: IrGqlType[];
  queries: IrGqlQuery[];
  mutations: MutationNode[];
  contexts: ContextNode[];
  resolvers: ResolverNode[];
}
