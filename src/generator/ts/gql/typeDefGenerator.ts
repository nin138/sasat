import { PropertyAssignment } from '../code/node/propertyAssignment.js';
import { TsFile } from '../file.js';
import { tsg } from '../code/factory.js';
import { RootNode } from '../../../parser/node/rootNode.js';
import { TypeDefNode } from '../../../parser/node/gql/typeDefNode.js';
import { MutationNode } from '../../../parser/node/gql/mutationNode.js';
import { SubscriptionFilterNode } from '../../../parser/node/gql/subscriptionFilterNode.js';
import { QueryNode } from '../../../parser/node/gql/queryNode.js';

export class TypeDefGenerator {
  generate(root: RootNode): TsFile {
    const typeDefs = root.entities().flatMap(it => it.allTypeDefs());
    const types = [
      ...this.createTypes(typeDefs),
      this.createQuery(root.queries()),
      this.createMutation(root.mutations()),
      this.createSubscription(root.mutations()),
    ].filter(it => it !== undefined) as PropertyAssignment[];
    return new TsFile(
      tsg
        .variable('const', tsg.identifier('typeDefs'), tsg.object(...types))
        .export(),
      tsg.variable('const', tsg.identifier('inputs'), tsg.object(...this.createInputs(root)))
        .export(),
    );
  }
  private createTypes(types: TypeDefNode[]): PropertyAssignment[] {
    return types.map(type =>
      tsg.propertyAssign(
        type.typeName,
        tsg.array(type.params.map(it => tsg.string(it.toGqlString()))),
      ),
    );
  }

  static ListQueryOptionType = 'ListQueryOption';
  private createInputs(root: RootNode): PropertyAssignment[] {
    const listQueryOption = tsg.propertyAssign(
      TypeDefGenerator.ListQueryOptionType,
      tsg.array([
        `number: Int!`,
        `offset: Int`,
        'order: String',
        'asc: Boolean',
      ].map(tsg.string)),
    )

    return [
      listQueryOption,
      ...root.mutations().filter(MutationNode.isCreateMutation)
      .map(node => {
        return tsg.propertyAssign(
          node.entityName.createInputName(),
          tsg.array(node.requestParams.map(it => tsg.string(it.toGqlString())))
        )
      })
    ]

  }

  private createQuery(nodes: QueryNode[]): PropertyAssignment {
    return tsg.propertyAssign(
      'Query',
      tsg.array(nodes.map(it => tsg.string(it.toGqlString()))),
    );
  }

  private createMutation(nodes: MutationNode[]): PropertyAssignment {
    return tsg.propertyAssign(
      'Mutation',
      tsg.array(nodes.map(it => tsg.string(it.toTypeDefString()))),
    );
  }

  private createSubscription(
    nodes: MutationNode[],
  ): PropertyAssignment | undefined {
    const createParam = (filters: SubscriptionFilterNode[]): string => {
      if (filters.length === 0) return '';
      return `(${filters
        .map(it => `${it.columnName}: ${it.type}!`)
        .join(', ')})`;
    };
    const subscriptions = nodes
      .filter(it => it.subscribed)
      .map(it => {
        const returnType = !MutationNode.isDeleteMutation(it)
          ? `${it.entityName}!`
          : `Deleted${it.entityName}!`;
        return `${it.entityName}${it.type}${createParam(
          it.subscriptionFilters,
        )}: ${returnType}`;
      })
      .map(tsg.string);
    if (subscriptions.length === 0) return undefined;
    return new PropertyAssignment('Subscription', tsg.array(subscriptions));
  }
}
