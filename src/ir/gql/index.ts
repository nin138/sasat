import { IrGqlType } from './types';
import { IrGqlQuery } from './query';
import { IrGqlMutation } from './mutation';
import { IrGqlContext } from './context';
import { IrGqlResolver } from './resolver';
import { MutationNode } from '../../node/gql/mutationNode';
import { ContextNode } from '../../node/gql/contextNode';

export interface IrGql {
  types: IrGqlType[];
  queries: IrGqlQuery[];
  mutations: MutationNode[];
  contexts: ContextNode[];
  resolvers: IrGqlResolver[];
}
