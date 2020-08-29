import { MutationNode } from '../../../../node/gql/mutationNode';
import { SubscriptionFilterNode } from '../../../../node/gql/subscriptionFilterNode';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { TsFile } from '../file';
import { QueryNode } from '../../../../node/gql/queryNode';
import { tsg } from '../code/factory';
import { TypeDefNode } from '../../../../node/gql/typeDefNode';
import { RootNode } from '../../../../node/rootNode';

export class TypeDefGenerator {
  generate(root: RootNode): TsFile {
    const typeDefs = root.entities().flatMap(it => it.typeDefs());
    const types = [
      ...this.createTypes(typeDefs),
      this.createQuery(root.gql.queries),
      this.createMutation(root.gql.mutations),
      this.createSubscription(root.gql.mutations),
    ].filter(it => it !== undefined) as PropertyAssignment[];
    return new TsFile(tsg.variable('const', tsg.identifier('typeDef'), tsg.object(...types)).export());
  }
  private createTypes(types: TypeDefNode[]): PropertyAssignment[] {
    return types.map(type =>
      tsg.propertyAssign(type.typeName, tsg.array(type.params.map(it => tsg.string(it.toGqlString())))),
    );
  }

  private createQuery(nodes: QueryNode[]): PropertyAssignment {
    return tsg.propertyAssign('Query', tsg.array(nodes.map(it => tsg.string(it.toGqlString()))));
  }

  private createMutation(nodes: MutationNode[]): PropertyAssignment {
    return tsg.propertyAssign('Mutation', tsg.array(nodes.map(it => tsg.string(it.toTypeDefString()))));
  }

  private createSubscription(nodes: MutationNode[]): PropertyAssignment | undefined {
    const createParam = (filters: SubscriptionFilterNode[]): string => {
      if (filters.length === 0) return '';
      return `(${filters.map(it => `${it.columnName}: ${it.type}!`).join(', ')})`;
    };
    const subscriptions = nodes
      .filter(it => it.subscribed)
      .map(it => {
        const returnType = MutationNode.isDeleteMutation(it) ? `${it.entityName}!` : `Deleted${it.entityName}!`;
        return `${it.entityName}${it.type}${createParam(it.subscriptionFilters)}: ${returnType}`;
      })
      .map(tsg.string);
    if (subscriptions.length === 0) return undefined;
    return new PropertyAssignment('Subscription', tsg.array(subscriptions));
  }
}
