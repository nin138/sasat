import { GqlPrimitive } from '../../generator/gql/types';

export interface IrGqlSubscription {
  onCreate: boolean;
  onUpdate: boolean;
  onDelete: boolean;
  filter: Array<{ column: string; type: GqlPrimitive | string }>;
}
