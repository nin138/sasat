import { IrGqlParam } from './types';

export interface IrGqlQuery {
  queryName: string;
  entity: string;
  params: IrGqlParam[];
  repositoryFunctionName: string;
  isArray: boolean;
  isNullable: boolean;
}
