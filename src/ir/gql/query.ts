import { IrGqlParam } from './types';

export interface IrGqlQuery {
  queryName: string;
  queryType: IrGqlQueryType;
  entity: string;
  params: IrGqlParam[];
  repositoryFunctionName: string;
  isArray: boolean;
  isNullable: boolean;
}

export enum IrGqlQueryType {
  List,
  Primary,
  Reference,
}
