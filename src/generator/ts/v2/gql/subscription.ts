import { MutationNode } from '../../../../node/gql/mutationNode';
import { TsFile } from '../file';
import { VariableDeclaration } from '../code/node/variableDeclaration';
import { Identifier } from '../code/node/Identifier';
import { EnumDeclaration } from '../code/node/enumDeclaration';
import { EnumMember } from '../code/node/enumMember';
import { EntityName } from '../../../../entity/entityName';
import { ArrayLiteral, ObjectLiteral, StringLiteral } from '../code/node/literal/literal';
import { PropertyAssignment } from '../code/node/propertyAssignment';
import { ArrowFunction } from '../code/node/arrowFunction';
import { CallExpression } from '../code/node/callExpression';
import { PropertyAccessExpression } from '../code/node/propertyAccessExpression';
import { AsyncExpression } from '../code/node/asyncExpression';
import { Parameter } from '../code/node/parameter';
import { TypeReference } from '../code/node/type/typeReference';
import { KeywordTypeNode } from '../code/node/type/typeKeyword';
import { Block } from '../code/node/block';
import { AwaitExpression } from '../code/node/awaitExpression';
import { ReturnStatement } from '../code/node/returnStatement';
import { BinaryExpression } from '../code/node/binaryExpression';
import { GeneratedPath, getEntityPath } from '../../../../constants/directory';

interface Subscription {
  entity: EntityName;
  event: 'Created' | 'Updated' | 'Deleted';
  filters: string[];
}

export class SubscriptionGenerator {
  generate(nodes: MutationNode[]): TsFile {
    const data = this.createData(nodes);
    return this.createFile(data);
  }

  private createAsyncIteratorCall(event: string): ArrowFunction {
    return new ArrowFunction(
      [],
      undefined,
      new CallExpression(
        new PropertyAccessExpression(new Identifier('pubsub').importFrom('../pubsub'), 'asyncIterator'),
        new ArrayLiteral([new Identifier(`SubscriptionName.${event}`)]),
      ),
    );
  }

  private createFile(data: Subscription[]) {
    const subscriptionEnum = new EnumDeclaration(new Identifier('SubscriptionName'), []).export();
    const subscriptions = new ObjectLiteral();
    const publishFunctions: VariableDeclaration[] = [];
    data.forEach(it => {
      const event = it.entity.name + it.event;
      subscriptionEnum.addMembers(new EnumMember(new Identifier(event), new StringLiteral(event)));
      const fn =
        it.filters.length === 0 ? this.createAsyncIteratorCall(event) : this.createWithFilter(event, it.filters);
      subscriptions.addProperties(
        new PropertyAssignment(event, new ObjectLiteral(new PropertyAssignment('subscribe', fn))),
      );
      publishFunctions.push(
        new VariableDeclaration(
          'const',
          new Identifier(`publish${event}`),
          new ArrowFunction(
            [
              new Parameter(
                'entity',
                new TypeReference(
                  it.event === 'Deleted' ? it.entity.identifiableInterfaceName() : it.entity.name,
                ).importFrom(getEntityPath(GeneratedPath, it.entity.name)),
              ),
            ],
            new TypeReference('Promise', [KeywordTypeNode.void]),
            new CallExpression(
              new Identifier('pubsub.publish'),
              new Identifier(`SubscriptionName.${event}`),
              new ObjectLiteral(new PropertyAssignment(event, new Identifier('entity'))),
            ),
          ),
        ).export(),
      );
    });
    return new TsFile(
      subscriptionEnum,
      new VariableDeclaration('const', new Identifier('subscription'), subscriptions).export(),
      ...publishFunctions,
    );
  }

  private createWithFilter(event: string, filters: string[]) {
    const binaryExpressions = filters
      .map(it => new BinaryExpression(new Identifier(`result.${it}`), '===', new Identifier(`variables.${it}`)))
      .reduce((previousValue, currentValue) => new BinaryExpression(previousValue, '&&', currentValue));

    return new CallExpression(
      new Identifier('withFilter').importFrom('graphql-subscriptions'),
      this.createAsyncIteratorCall(event),
      new AsyncExpression(
        new ArrowFunction(
          [new Parameter('payload', KeywordTypeNode.any), new Parameter('variables', KeywordTypeNode.any)],
          new TypeReference('Promise', [KeywordTypeNode.boolean]),
          new Block(
            new VariableDeclaration(
              'const',
              new Identifier('result'),
              new AwaitExpression(new Identifier(`payload.${event}`)),
            ),
            new ReturnStatement(binaryExpressions),
          ),
        ),
      ),
    );
  }

  private createData(nodes: MutationNode[]): Subscription[] {
    const data: Subscription[] = [];
    nodes.forEach(it => {
      if (it.onCreate.subscribed) {
        data.push({
          entity: it.entityName,
          event: 'Created',
          filters: it.subscriptionFilters.map(it => it.columnName),
        });
      }
      if (it.onUpdate.subscribed) {
        data.push({
          entity: it.entityName,
          event: 'Updated',
          filters: it.subscriptionFilters.map(it => it.columnName),
        });
      }
      if (it.onDelete.subscribed) {
        data.push({
          entity: it.entityName,
          event: 'Deleted',
          filters: it.subscriptionFilters.map(it => it.columnName),
        });
      }
    });
    return data;
  }
}
