import { IrGqlType } from './types';
import { IrGqlQuery } from './query';
import { IrGqlMutation } from './mutation';

export interface IrGql {
  types: IrGqlType[];
  queries: IrGqlQuery[];
  mutations: IrGqlMutation;
}
