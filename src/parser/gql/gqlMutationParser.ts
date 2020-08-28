import { TableHandler } from '../../entity/table';
import { CreateMutationNode, DeleteMutationNode, MutationNode, UpdateMutationNode } from '../../node/gql/mutationNode';
import { Parser } from '../parser';
import { ContextParamNode } from '../../node/gql/contextParamNode';
import { SubscriptionFilterNode } from '../../node/gql/subscriptionFilterNode';
import { EntityNode } from '../../node/entity';

export class GqlMutationParser {
  parse = (table: TableHandler): MutationNode[] => {
    const result: MutationNode[] = [];
    const option = table.gqlOption;

    if (option.mutation.create) {
      result.push(new CreateMutationNode(...this.createParams(table, option.subscription.onCreate)));
    }
    if (option.mutation.update) {
      result.push(new UpdateMutationNode(...this.createParams(table, option.subscription.onUpdate)));
    }
    if (option.mutation.create) {
      result.push(new DeleteMutationNode(...this.createParams(table, option.subscription.onDelete)));
    }
    return result;
  };

  private createParams(
    table: TableHandler,
    subscribed: boolean,
  ): [EntityNode, string[], string, ContextParamNode[], boolean, SubscriptionFilterNode[]] {
    return [
      Parser.tableToEntityNode(table),
      table.primaryKey,
      Parser.paramsToQueryName(...table.primaryKey),
      table.gqlOption.mutation.fromContextColumns.map(
        it => new ContextParamNode(it.column, it.contextName || it.column),
      ),
      subscribed,
      table.gqlOption.subscription.filter.map(it => new SubscriptionFilterNode(it, table.column(it)!.gqlType())),
    ];
  }
}
