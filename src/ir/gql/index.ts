import { IrGqlType } from './types';
import { IrGqlQuery } from './query';

export interface IrGql {
  types: IrGqlType[];
  queries: IrGqlQuery[];
}
