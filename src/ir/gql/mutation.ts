import { IrGqlParam } from './types';

export interface IrGqlMutation {
  entities: IrGqlMutationEntity[];
}

export interface IrGqlMutationEntity {
  entityName: string;
  onCreateParams: IrGqlParam[];
  onUpdateParams: IrGqlParam[];
}
