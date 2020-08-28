import { ContextParamNode } from './contextParamNode';
import { SubscriptionFilterNode } from './subscriptionFilterNode';
import { EntityName } from '../../entity/entityName';
import { EntityNode } from '../entity';

type MutationType = 'Created' | 'Deleted' | 'Updated';

export class MutationNode {
  protected constructor(
    readonly entity: EntityNode,
    readonly entityName: EntityName,
    readonly type: MutationType,
    readonly subscribed: boolean,
    readonly contextParams: ContextParamNode[],
    readonly primaryKeys: string[],
    readonly primaryFindQueryName: string,
    readonly subscriptionFilters: SubscriptionFilterNode[],
  ) {}

  publishFunctionName(): string {
    return `publish${this.entityName}${this.type}`;
  }

  useContextParams(): boolean {
    return this.contextParams.length !== 0;
  }

  static isCreateMutation(node: MutationNode): node is CreateMutationNode {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return node instanceof CreateMutationNode;
  }
  static isUpdateMutation(node: MutationNode): node is UpdateMutationNode {
    return node.type === 'Updated';
  }
  static isDeleteMutation(node: MutationNode): node is DeleteMutationNode {
    return node.type === 'Deleted';
  }
}

export class CreateMutationNode extends MutationNode {
  private created = true;
  constructor(
    entity: EntityNode,
    primaryKeys: string[],
    primaryFindQueryName: string,
    contextParams: ContextParamNode[],
    subscribed: boolean,
    subscriptionFilters: SubscriptionFilterNode[],
  ) {
    super(
      entity,
      entity.entityName,
      'Created',
      subscribed,
      contextParams,
      primaryKeys,
      primaryFindQueryName,
      subscriptionFilters,
    );
  }
}

export class UpdateMutationNode extends MutationNode {
  private updated = true;
  constructor(
    entity: EntityNode,
    primaryKeys: string[],
    primaryFindQueryName: string,
    contextParams: ContextParamNode[],
    subscribed: boolean,
    subscriptionFilters: SubscriptionFilterNode[],
  ) {
    super(
      entity,
      entity.entityName,
      'Updated',
      subscribed,
      contextParams,
      primaryKeys,
      primaryFindQueryName,
      subscriptionFilters,
    );
  }
}

export class DeleteMutationNode extends MutationNode {
  private deleted = true;
  constructor(
    entity: EntityNode,
    primaryKeys: string[],
    primaryFindQueryName: string,
    contextParams: ContextParamNode[],
    subscribed: boolean,
    subscriptionFilters: SubscriptionFilterNode[],
  ) {
    super(
      entity,
      entity.entityName,
      'Deleted',
      subscribed,
      contextParams,
      primaryKeys,
      primaryFindQueryName,
      subscriptionFilters,
    );
  }
}
