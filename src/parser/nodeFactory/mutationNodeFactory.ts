import {
  CreateMutationNode,
  DeleteMutationNode,
  MutationNode,
  UpdateMutationNode,
} from '../node/gql/mutationNode.js';
import { ContextParamNode } from '../node/gql/contextParamNode.js';
import { SubscriptionFilterNode } from '../node/gql/subscriptionFilterNode.js';
import { EntityNode } from '../node/entityNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { FindMethodNode } from '../node/findMethod.js';

export class MutationNodeFactory {
  create = (table: TableHandler, entity: EntityNode): MutationNode[] => {
    if (!table.gqlOption.enabled) return [];
    const result: MutationNode[] = [];
    const options = table.gqlOption.mutation;

    if (options.create.enabled) {
      const option = options.create;
      result.push(
        new CreateMutationNode(
          ...this.createParams(
            table,
            entity,
            option.subscription,
            option.subscriptionFilter,
          ),
          !option.noReFetch,
        ),
      );
    }
    if (options.update.enabled) {
      const option = options.update;
      result.push(
        new UpdateMutationNode(
          ...this.createParams(
            table,
            entity,
            option.subscription,
            option.subscriptionFilter,
          ),
          !option.noReFetch,
        ),
      );
    }
    if (options.delete.enabled) {
      const option = options.delete;
      result.push(
        new DeleteMutationNode(
          ...this.createParams(
            table,
            entity,
            option.subscription,
            option.subscriptionFilter,
          ),
        ),
      );
    }
    return result;
  };

  private createParams(
    table: TableHandler,
    entity: EntityNode,
    subscribed: boolean,
    filter: string[],
  ): [
    EntityNode,
    string[],
    string,
    ContextParamNode[],
    boolean,
    SubscriptionFilterNode[],
  ] {
    const primaryKeys = table.primaryKey.map(it =>
      table.column(it).fieldName(),
    );
    return [
      entity,
      primaryKeys,
      FindMethodNode.paramsToName(...primaryKeys),
      table.gqlOption.mutation.fromContextColumns.map(
        it => new ContextParamNode(it.column, it.contextName || it.column),
      ),
      subscribed,
      filter.map(
        it => new SubscriptionFilterNode(it, table.column(it)!.gqlType()),
      ),
    ];
  }
}
