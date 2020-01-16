import { IrGqlParam } from './types';
import { GqlPrimitive } from '../../generator/gql/types';

export interface IrGqlMutation {
  entities: IrGqlMutationEntity[];
}

export interface IrGqlMutationEntity {
  entityName: string;
  primaryKeys: string[];
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
  filter: Array<{ column: string; type: GqlPrimitive | string }>;
}
