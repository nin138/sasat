import { TableHandler } from '../../entity/table';
import { MutationFunctionNode, MutationNode } from '../../node/gql/mutationNode';
import { Parser } from '../parser';
import { ContextParamNode } from '../../node/gql/contextParamNode';
import { SubscriptionFilterNode } from '../../node/gql/subscriptionFilterNode';

export class GqlMutationParser {
  parse = (table: TableHandler): MutationNode => {
    return new MutationNode(
      table.getEntityName(),
      table.primaryKey,
      Parser.paramsToQueryName(...table.primaryKey),
      new MutationFunctionNode(table.gqlOption.mutation.create, table.gqlOption.subscription.onCreate),
      new MutationFunctionNode(table.gqlOption.mutation.update, table.gqlOption.subscription.onUpdate),
      new MutationFunctionNode(table.gqlOption.mutation.delete, table.gqlOption.subscription.onDelete),
      table.gqlOption.mutation.fromContextColumns.map(
        it => new ContextParamNode(it.column, it.contextName || it.column),
      ),
      table.gqlOption.subscription.filter.map(it => new SubscriptionFilterNode(it, table.column(it)!.gqlType())),
    );
  };
}
