import { PropertyAssignment } from '../code/node/propertyAssignment';
import { TsFile } from '../file';
import { tsg } from '../code/factory';
import { RootNode } from '../../../parser/node/rootNode';
import { TypeDefNode } from '../../../parser/node/gql/typeDefNode';
import { MutationNode } from '../../../parser/node/gql/mutationNode';
import { SubscriptionFilterNode } from '../../../parser/node/gql/subscriptionFilterNode';
import { QueryNode } from '../../../parser/node/gql/queryNode';

export class TypeDefGenerator {
  generate(root: RootNode): TsFile {
    const typeDefs = root.entities().flatMap(it => it.allTypeDefs());
    const types = [
      ...this.createTypes(typeDefs),
      this.createQuery(root.queries()),
      this.createMutation(root.mutations()),
      this.createSubscription(root.mutations()),
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
