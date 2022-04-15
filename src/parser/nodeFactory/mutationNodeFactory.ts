import { CreateMutationNode, DeleteMutationNode, MutationNode, UpdateMutationNode } from '../node/gql/mutationNode.js';
import { Parser } from '../parser.js';
import { ContextParamNode } from '../node/gql/contextParamNode.js';
import { SubscriptionFilterNode } from '../node/gql/subscriptionFilterNode.js';
import { EntityNode } from '../node/entityNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { FindMethodNode } from '../node/findMethod.js';

export class MutationNodeFactory {
  create = (table: TableHandler, entity: EntityNode): MutationNode[] => {
    const result: MutationNode[] = [];
    const option = table.gqlOption;

    if (option.mutation.create) {
      result.push(new CreateMutationNode(...this.createParams(table, entity, option.subscription.onCreate)));
    }
    if (option.mutation.update) {
      result.push(new UpdateMutationNode(...this.createParams(table, entity, option.subscription.onUpdate)));
    }
    if (option.mutation.create) {
      result.push(new DeleteMutationNode(...this.createParams(table, entity, option.subscription.onDelete)));
    }
    return result;
  };

  private createParams(
    table: TableHandler,
    entity: EntityNode,
    subscribed: boolean,
  ): [EntityNode, string[], string, ContextParamNode[], boolean, SubscriptionFilterNode[]] {
    const primaryKeys = table.primaryKey.map(it => table.column(it).fieldName());
    return [
      entity,
      primaryKeys,
      FindMethodNode.paramsToName(...primaryKeys),
      table.gqlOption.mutation.fromContextColumns.map(
        it => new ContextParamNode(it.column, it.contextName || it.column),
      ),
      subscribed,
      table.gqlOption.subscription.filter.map(it => new SubscriptionFilterNode(it, table.column(it)!.gqlType())),
    ];
  }
}
