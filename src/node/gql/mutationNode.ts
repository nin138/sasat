import { ContextParamNode } from './contextParamNode';
import { SubscriptionFilterNode } from './subscriptionFilterNode';
import { EntityName } from '../../entity/entityName';

export class MutationFunctionNode {
  constructor(readonly enabled: boolean, readonly subscribed: boolean) {}
}

export class MutationNode {
  constructor(
    readonly entityName: EntityName,
    readonly primaryKeys: string[],
    readonly primaryFindQueryName: string,
    readonly onCreate: MutationFunctionNode,
    readonly onUpdate: MutationFunctionNode,
    readonly onDelete: MutationFunctionNode,
    readonly contextParams: ContextParamNode[],
    readonly subscriptionFilters: SubscriptionFilterNode[],
  ) {}

  publishCreateFunctionName(): string {
    return `publish${this.entityName}Created`;
  }

  publishUpdateFunctionName(): string {
    return `publish${this.entityName}Updated`;
  }

  publishDeleteFunctionName(): string {
    return `publish${this.entityName}Deleted`;
  }

  useContextParams(): boolean {
    return this.contextParams.length !== 0;
  }
}
