import { IrGqlType } from './types';
import { IrGqlQuery } from './query';

export interface IrGql {
  type: IrGqlType[];
  queries: IrGqlQuery[];
}
