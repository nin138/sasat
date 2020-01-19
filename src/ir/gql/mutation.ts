import { IrGqlParam } from './types';
import { GqlPrimitive } from '../../generator/gql/types';
import { DBColumnTypes } from '../../migration/column/columnTypes';

export interface IrGqlMutation {
  entities: IrGqlMutationEntity[];
}

export interface IrGqlMutationEntity {
  entityName: string;
  primaryKeys: IrGqlParam[];
  onCreateParams: IrGqlParam[];
  onUpdateParams: IrGqlParam[];
  create: boolean;
  update: boolean;
  delete: boolean;
  fromContextColumns: Array<{ columnName: string; contextName: string }>;
  subscription: IrGqlSubscription;
}

export interface IrGqlSubscription {
  onCreate: boolean;
  onUpdate: boolean;
  onDelete: boolean;
  filter: Array<{ column: string; type: GqlPrimitive | string }>;
}
