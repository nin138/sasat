import { RootNode } from '../../nodes/rootNode.js';
import {
  Identifier,
  PropertyAssignment,
  TsFile,
  tsg,
} from '../../../tsg/index.js';
import { MutationNode } from '../../nodes/mutationNode.js';
import { Directory } from '../../directory.js';
import { makeTypeRef } from './scripts/getEntityTypeRefs.js';
import { makeDatasource } from './scripts/makeDatasource.js';
import { makePrimaryFindQueryName, publishFunctionName } from '../names.js';

export const generateMutationResolver = (root: RootNode) => {
  return new TsFile(
    tsg.variable(
      'const',
      'mutation',
      tsg.object(...root.mutations.map(makeMutation)),
    ),
  ).disableEsLint();
};

const makeMutation = (node: MutationNode): PropertyAssignment => {
  if (node.mutationType === 'create') return makeCreateMutation(node);
};

const makeResolver = tsg.identifier('makeResolver').importFrom('sasat');
const context = tsg
  .typeRef('GQLContext')
  .importFrom(Directory.resolve('GENERATED', 'BASE', 'context'));
const makeResolverArgs = [
  tsg.parameter('_'),
  tsg.parameter('params'),
  tsg.parameter('context'),
  tsg.parameter('info'),
];

const makeCreateMutation = (node: MutationNode) => {
  return tsg.propertyAssign(
    node.mutationName,
    makeResolver
      .call(
        tsg.arrowFunc(
          makeResolverArgs,
          undefined,
          makeCreateMutationBody(node),
        ),
      )
      .typeArgs(
        context,
        makeTypeRef(node.entityName, 'creatable', 'GENERATED'),
      ),
  );
};

const makeCreateMutationBody = (node: MutationNode) => {
  const ds = tsg.identifier('ds');
  const dsVariable = tsg.variable(
    'const',
    ds,
    makeDatasource(node.entityName, 'GENERATED'),
  );
  const createCall = ds.property('create').call(tsg.identifier('params'));
  if (!node.enableSubscription && !node.refetch)
    return tsg.block(dsVariable, tsg.return(createCall));
  const result = tsg.identifier('result');
  const ident = tsg.identifier('identifiable');
  const publishEvent = (ident: Identifier) =>
    tsg
      .await(
        tsg
          .identifier(publishFunctionName(node.entityName, node.mutationType))
          .importFrom('./subscription')
          .call(ident),
      )
      .toStatement();
  if (!node.refetch) {
    return tsg.block(
      dsVariable,
      tsg.variable('const', result, tsg.await(createCall)),
      node.enableSubscription ? publishEvent(result) : null,
      tsg.return(result),
    );
  }

  const refetched = tsg.identifier('refetched');
  return tsg.block(
    dsVariable,
    tsg.variable('const', result, tsg.await(createCall)),
    tsg.variable(
      'const',
      ident,
      tsg
        .identifier('pick')
        .importFrom('sasat')
        .call(result, tsg.array(node.identifyKeys.map(tsg.string)))
        .as(tsg.typeRef('unknown'))
        .as(makeTypeRef(node.entityName, 'identifiable', 'GENERATED')),
    ),
    tsg.variable(
      'const',
      refetched,
      tsg.await(
        ds
          .property(makePrimaryFindQueryName(node.identifyKeys))
          .call(...node.identifyKeys.map(it => ident.property(it))),
      ),
    ),
    node.enableSubscription ? publishEvent(refetched) : null,
    tsg.return(refetched),
  );
};
