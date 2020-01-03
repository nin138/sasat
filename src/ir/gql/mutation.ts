import { IrGqlParam } from './types';

export interface IrGqlMutation {
  entities: IrGqlMutationEntity[];
}

export interface IrGqlMutationEntity {
  entityName: string;
  onCreateParams: IrGqlParam[];
  onUpdateParams: IrGqlParam[];
  subscription: IrGqlSubscription;
}

export interface IrGqlSubscription {
  onCreate: boolean;
  onUpdate: boolean;
}
