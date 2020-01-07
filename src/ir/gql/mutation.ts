import { IrGqlParam } from './types';

export interface IrGqlMutation {
  entities: IrGqlMutationEntity[];
}

export interface IrGqlMutationEntity {
  entityName: string;
  onCreateParams: IrGqlParam[];
  onUpdateParams: IrGqlParam[];
  create: boolean;
  update: boolean;
  fromContextColumns: Array<{ columnName: string; contextName: string }>;
  subscription: IrGqlSubscription;
}

export interface IrGqlSubscription {
  onCreate: boolean;
  onUpdate: boolean;
}
