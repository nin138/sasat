import { ContextParamNode } from './contextParamNode.js';
import { SubscriptionFilterNode } from './subscriptionFilterNode.js';
import { EntityNode } from '../entityNode.js';
import { ParameterNode } from '../parameterNode.js';
import { EntityTypeNode, TypeNode } from '../typeNode.js';
import { DBColumnTypes } from '../../../migration/column/columnTypes.js';
import { EntityName } from '../entityName.js';

type MutationType = 'Created' | 'Deleted' | 'Updated';

export abstract class MutationNode {
  protected constructor(
    readonly entity: EntityNode,
    readonly entityName: EntityName,
    readonly type: MutationType,
    readonly requestParams: ParameterNode[],
    readonly contextParams: ContextParamNode[],
    readonly returnType: TypeNode,
    readonly primaryKeys: string[],
    readonly primaryFindQueryName: string,
    readonly subscribed: boolean,
    readonly subscriptionFilters: SubscriptionFilterNode[],
    readonly reFetch: boolean,
  ) {}

  publishFunctionName(): string {
    return `publish${this.entityName}${this.type}`;
  }

  useContextParams(): boolean {
    return this.contextParams.length !== 0 || this.reFetch;
  }

  toTypeDefString(): string {
    return (
      this.functionName() +
      ParameterNode.parametersToGqlString(...this.requestParams) +
      ':' +
      this.returnType.toGqlString()
    );
  }

  abstract functionName(): string;

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
  private __created = true;
  constructor(
    entity: EntityNode,
    primaryKeys: string[],
    primaryFindQueryName: string,
    contextParams: ContextParamNode[],
    subscribed: boolean,
    subscriptionFilters: SubscriptionFilterNode[],
    reFetch: boolean,
  ) {
    super(
      entity,
      entity.entityName,
      'Created',
      [
        ...entity.onCreateRequiredFields().map(it => it.toParam()),
        ...entity.onCreateOptionalFields().map(it => it.toOptionalParam()),
      ],
      contextParams,
      new EntityTypeNode(entity.entityName, false, false),
      primaryKeys,
      primaryFindQueryName,
      subscribed,
      subscriptionFilters,
      reFetch,
    );
  }

  functionName(): string {
    return `create${this.entityName}`;
  }
}

export class UpdateMutationNode extends MutationNode {
  private __updated = true;
  constructor(
    entity: EntityNode,
    primaryKeys: string[],
    primaryFindQueryName: string,
    contextParams: ContextParamNode[],
    subscribed: boolean,
    subscriptionFilters: SubscriptionFilterNode[],
    reFetch: boolean,
  ) {
    super(
      entity,
      entity.entityName,
      'Updated',
      [
        ...entity.identifiableFields().map(it => it.toParam()),
        ...entity.dataFields().map(it => it.toOptionalParam()),
      ],
      contextParams,
      reFetch
        ? new EntityTypeNode(entity.entityName, false, false)
        : new EntityTypeNode(DBColumnTypes.boolean, false, false),
      primaryKeys,
      primaryFindQueryName,
      subscribed,
      subscriptionFilters,
      reFetch,
    );
  }
  functionName(): string {
    return `update${this.entityName}`;
  }
}

export class DeleteMutationNode extends MutationNode {
  private __deleted = true;
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
      [...entity.identifiableFields().map(it => it.toParam())],
      contextParams,
      new EntityTypeNode(DBColumnTypes.boolean, false, false),
      primaryKeys,
      primaryFindQueryName,
      subscribed,
      subscriptionFilters,
      false,
    );
  }
  functionName(): string {
    return `delete${this.entityName}`;
  }
}
