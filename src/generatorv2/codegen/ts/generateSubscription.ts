import {
  ArrowFunction,
  KeywordTypeNode,
  TsFile,
  tsg,
  VariableDeclaration,
} from '../../../tsg/index.js';
import { RootNode } from '../../nodes/rootNode.js';
import { SubscriptionFilterNode } from '../../nodes/subscriptionNode.js';
import { makeTypeRef } from './scripts/getEntityTypeRefs.js';

export const generateSubscription = (root: RootNode) => {
  const subscriptionEnum = tsg
    .enum(tsg.identifier('SubscriptionName'), [])
    .export();
  const subscriptions = tsg.object();
  const publishFunctions: VariableDeclaration[] = [];

  root.subscriptions.forEach(it => {
    subscriptionEnum.addMembers(
      tsg.enumMember(
        tsg.identifier(it.subscriptionName),
        tsg.string(it.subscriptionName),
      ),
    );
    const fn =
      it.filters.length === 0
        ? makeAsyncIteratorCall(it.subscriptionName)
        : makeWithFilter(it.subscriptionName, it.filters);
    subscriptions.addProperties(
      tsg.propertyAssign(
        it.subscriptionName,
        tsg.object(tsg.propertyAssign('subscribe', fn)),
      ),
    );
    publishFunctions.push(
      tsg
        .variable(
          'const',
          tsg.identifier(it.publishFunctionName),
          tsg.arrowFunc(
            [
              tsg.parameter(
                'entity',
                makeTypeRef(
                  it.entity,
                  it.mutationType === 'delete' ? 'identifiable' : 'entity',
                  'GENERATED',
                ),
              ),
            ],
            tsg.typeRef('Promise', [KeywordTypeNode.void]),
            tsg
              .identifier('pubsub.publish')
              .call(
                tsg.identifier(`SubscriptionName.${it.subscriptionName}`),
                tsg.object(
                  tsg.propertyAssign(
                    it.subscriptionName,
                    tsg.identifier('entity'),
                  ),
                ),
              ),
          ),
        )
        .export(),
    );
  });

  return new TsFile(
    subscriptionEnum,
    tsg
      .variable('const', tsg.identifier('subscription'), subscriptions)
      .export(),
    ...publishFunctions,
  ).disableEsLint();
};

const makeAsyncIteratorCall = (event: string): ArrowFunction => {
  return tsg.arrowFunc(
    [],
    undefined,
    tsg
      .identifier('pubsub')
      .importFrom('../pubsub')
      .property('asyncIterator')
      .call(tsg.array([tsg.identifier(`SubscriptionName.${event}`)])),
  );
};

const makeWithFilter = (event: string, filters: SubscriptionFilterNode[]) => {
  const binaryExpressions = filters
    .map(it =>
      tsg.binary(
        tsg.identifier(`result.${it.field}`),
        '===',
        tsg.identifier(`variables.${it.field}`),
      ),
    )
    .reduce((previousValue, currentValue) =>
      tsg.binary(previousValue, '&&', currentValue),
    );

  return tsg
    .identifier('withFilter')
    .importFrom('graphql-subscriptions')
    .call(
      makeAsyncIteratorCall(event),
      tsg
        .arrowFunc(
          [
            tsg.parameter('payload', KeywordTypeNode.any),
            tsg.parameter('variables', KeywordTypeNode.any),
          ],
          tsg.typeRef('Promise', [KeywordTypeNode.boolean]),
          tsg.block(
            tsg.variable(
              'const',
              tsg.identifier('result'),
              tsg.await(tsg.identifier(`payload.${event}`)),
            ),
            tsg.return(binaryExpressions),
          ),
        )
        .toAsync(),
    );
};
