import { RootNode } from '../../nodes/rootNode.js';
import {
  Block,
  Identifier,
  KeywordTypeNode,
  NumericLiteral,
  PropertyAssignment,
  TsFile,
  tsg,
  TsStatement,
  TsType,
} from '../../../tsg/index.js';
import { ContextField, MutationNode } from '../../nodes/mutationNode.js';
import { Directory } from '../../directory.js';
import { makeTypeRef } from './scripts/getEntityTypeRefs.js';
import { makeDatasource } from './scripts/makeDatasource.js';
import { makeFindQueryName, publishFunctionName } from '../names.js';
import { nonNullableFilter } from '../../../util/type.js';

export const generateMutationResolver = (root: RootNode) => {
  return new TsFile(
    tsg
      .variable(
        'const',
        'mutation',
        tsg.object(...root.mutations.map(makeMutation)),
      )
      .export(),
  ).disableEsLint();
};

const result = tsg.identifier('result');
const refetched = tsg.identifier('refetched');
const ds = tsg.identifier('ds');
const ident = tsg.identifier('identifiable');

const makeMutation = (node: MutationNode): PropertyAssignment => {
  return tsg.propertyAssign(
    node.mutationName,
    makeResolver
      .call(
        tsg
          .arrowFunc(makeResolverArgs(node), undefined, makeMutationBody(node))
          .toAsync(),
      )
      .typeArgs(context, makeParamType(node)),
  );
};

const makeParamType = (node: MutationNode): TsType => {
  if (node.mutationType === 'create')
    return makeTypeRef(node.entityName, 'creatable', 'GENERATED');
  if (node.mutationType === 'update')
    return tsg.intersectionType(
      makeTypeRef(node.entityName, 'identifiable', 'GENERATED'),
      makeTypeRef(node.entityName, 'updatable', 'GENERATED'),
    );
  return makeTypeRef(node.entityName, 'identifiable', 'GENERATED');
};

const makeMutationBody = (node: MutationNode) => {
  if (node.mutationType === 'create') return makeCreateMutationBody(node);
  if (node.mutationType === 'update') return makeUpdateMutationBody(node);
  return makeDeleteMutationBody(node);
};

const makeResolver = tsg.identifier('makeResolver').importFrom('sasat');
const context = tsg
  .typeRef('GQLContext')
  .importFrom(Directory.resolve('GENERATED', 'BASE', 'context'));
const makeResolverArgs = (node: MutationNode) =>
  [
    tsg.parameter('_'),
    tsg.parameter('params'),
    node.contextFields.length === 0 ? null : tsg.parameter('context'),
  ].filter(nonNullableFilter);

const makeCreateMutationBody = (node: MutationNode) => {
  const dsVariable = tsg.variable(
    'const',
    ds,
    makeDatasource(node.entityName, 'GENERATED'),
  );
  const createCall = ds.property('create').call(tsg.identifier('params'));
  if (!node.subscription && !node.refetch)
    return tsg.block(dsVariable, tsg.return(createCall));

  if (!node.refetch) {
    return tsg.block(
      dsVariable,
      tsg.variable('const', result, tsg.await(createCall)),
      node.subscription ? makePublishCall(node, result) : null,
      tsg.return(result),
    );
  }

  return tsg.block(
    dsVariable,
    tsg.variable('const', result, tsg.await(createCall)),
    ...makeRefetched(node),
    node.subscription ? makePublishCall(node, refetched) : null,
    tsg.return(refetched),
  );
};

const makeRefetched = (node: MutationNode) => {
  return [
    tsg.variable(
      'const',
      ident,
      tsg
        .identifier('pick')
        .importFrom('sasat')
        .call(
          node.mutationType === 'create' ? result : tsg.identifier('params'),
          tsg.array(node.identifyFields.map(tsg.string)),
        )
        .as(tsg.typeRef('unknown'))
        .as(makeTypeRef(node.entityName, 'identifiable', 'GENERATED')),
    ),
    tsg.variable(
      'const',
      refetched,
      tsg.await(
        ds
          .property(makeFindQueryName(node.identifyFields))
          .call(...node.identifyFields.map(it => ident.property(it))),
      ),
    ),
  ];
};

const makePublishCall = (node: MutationNode, identifier: Identifier) => {
  return tsg
    .await(
      tsg
        .identifier(publishFunctionName(node.entityName, node.mutationType))
        .importFrom('./subscription')
        .call(
          identifier.as(makeTypeRef(node.entityName, 'entity', 'GENERATED')),
        ),
    )
    .toStatement();
};

const makeDatasourceParam = (contextParams: ContextField[]) => {
  const params = tsg.identifier('params');
  if (contextParams.length === 0) return params;
  return tsg.object(
    tsg.spreadAssign(params),
    ...contextParams.map(it =>
      tsg.propertyAssign(
        it.fieldName,
        tsg.identifier(`context.${it.contextName}`),
      ),
    ),
  );
};

const makeUpdateMutationBody = (node: MutationNode): Block => {
  const dsV = tsg.variable(
    'const',
    ds,
    makeDatasource(node.entityName, 'GENERATED'),
  );
  const resultV = tsg.variable(
    'const',
    result,
    tsg.await(
      ds
        .property('update')
        .call(makeDatasourceParam(node.contextFields))
        .property('then')
        .call(
          tsg.arrowFunc(
            [
              tsg.parameter(
                'it',
                tsg.typeRef('CommandResponse').importFrom('sasat'),
              ),
            ],
            KeywordTypeNode.boolean,
            tsg.binary(tsg.identifier('it.changedRows'), '===', tsg.number(1)),
          ),
        ),
    ),
  );
  const statements: TsStatement[] = [dsV, resultV];
  if (!node.refetch && !node.subscription) {
    return tsg.block(...statements, tsg.return(result));
  }
  return tsg.block(
    ...statements,
    ...makeRefetched(node),
    node.subscription ? makePublishCall(node, refetched) : null,
    tsg.return(refetched),
  );
};

const makeDeleteMutationBody = (node: MutationNode): Block => {
  const dsV = tsg.variable(
    'const',
    ds,
    makeDatasource(node.entityName, 'GENERATED'),
  );
  const params = tsg.identifier('params');
  const deleteCall = ds
    .property('delete')
    .call(params)
    .property('then')
    .call(
      tsg.arrowFunc(
        [
          tsg.parameter(
            'it',
            tsg.typeRef('CommandResponse').importFrom('sasat'),
          ),
        ],
        KeywordTypeNode.boolean,
        tsg.binary(
          tsg.identifier('it.affectedRows'),
          '===',
          new NumericLiteral(1),
        ),
      ),
    );
  return tsg.block(
    dsV,
    tsg.variable('const', result, tsg.await(deleteCall)),
    node.subscription
      ? tsg.if(result, tsg.block(makePublishCall(node, params)))
      : null,
    tsg.return(result),
  );
};
