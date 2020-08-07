import { IrGqlParam } from '../../ir/gql/types';
import { ContextColumnNode } from './contextColumnNode';
import { SubscriptionNode } from './subscriptionNode';

export class MutationNode {
  constructor(
    readonly entityName: string,
    readonly primaryKeys: string[],
    readonly create: boolean,
    readonly update: boolean,
    readonly del: boolean,
    readonly onCreateParams: IrGqlParam[],
    readonly onUpdateParams: IrGqlParam[],
    readonly onDeleteParams: IrGqlParam[],
    readonly contextColumns: ContextColumnNode[],
    readonly subscription: SubscriptionNode,
  ) {}
}
