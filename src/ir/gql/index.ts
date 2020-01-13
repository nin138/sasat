import { IrGqlType } from './types';
import { IrGqlQuery } from './query';
import { IrGqlMutation } from './mutation';
import { IrGqlContext } from './context';
import { IrGqlResolver } from './resolver';

export interface IrGql {
  types: IrGqlType[];
  queries: IrGqlQuery[];
  mutations: IrGqlMutation;
  contexts: IrGqlContext[];
  resolvers: IrGqlResolver[];
}
