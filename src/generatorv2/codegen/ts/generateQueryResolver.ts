import { RootNode } from '../../nodes/rootNode.js';
import {
  PropertyAssignment,
  TsExpression,
  TsFile,
  tsg,
} from '../../../tsg/index.js';
import { QueryNode } from '../../nodes/queryNode.js';
import { columnTypeToTsType } from '../../../migration/column/columnTypes.js';
import { makeTypeRef } from './scripts/getEntityTypeRefs.js';
import { makeDatasource } from './scripts/makeDatasource.js';
import { Directories, Directory } from '../../directory.js';
import { nonNullable } from '../../../runtime/util.js';
import { EntityNode } from '../../nodes/entityNode.js';
import { getArgs, GQLQuery } from '../../../migration/data/GQLOption.js';
import { toTsType } from '../../scripts/gqlTypes.js';
import { makeQueryConditionExpr } from './scripts/makeQueryConditionExpr.js';

const DIR: Directories = 'GENERATED';

export const generateQueryResolver = (root: RootNode) => {
  return new TsFile(
    tsg
      .variable(
        'const',
        'query',
        tsg.object(
          ...root.entities
            .flatMap(entity =>
              entity.queries.map(query => makeGQLQuery(entity, query)),
            )
            .filter(nonNullable),
        ),
      )
      .export(),
  ).disableEsLint();
};

const makeResolver = () => tsg.identifier('makeResolver').importFrom('sasat');
const fields = tsg.identifier('fields');

// TODO Remove
const makeQuery = (node: QueryNode): PropertyAssignment => {
  return tsg.propertyAssign(
    node.queryName,
    makeResolver()
      .call(
        tsg
          .arrowFunc(
            [
              tsg.parameter('_'),
              tsg.parameter(`{${node.args.map(it => it.name).join(',')}}`),
              tsg.parameter('context'),
              tsg.parameter('info'),
            ],
            undefined,
            makeQueryBody(node),
          )
          .toAsync(),
      )
      .typeArgs(
        tsg
          .typeRef('GQLContext')
          .importFrom(Directory.resolve(DIR, 'BASE', 'context')),
        tsg.typeLiteral(
          node.args.map(it =>
            tsg.propertySignature(
              it.name,
              tsg.typeRef(
                it.type.entity
                  ? it.type.typeName
                  : columnTypeToTsType(it.type.dbType),
              ),
            ),
          ),
        ),
      ),
  );
};

const pagingOption = {
  kind: 'paging-option',
  name: 'option',
  type: 'PagingOption',
} as const;
type PagingOptionArg = typeof pagingOption;

const makeGQLQuery = (
  entity: EntityNode,
  query: GQLQuery,
): PropertyAssignment => {
  const args = getArgs(query, entity);
  return tsg.propertyAssign(
    query.type === 'primary' ? entity.name.lowerCase() : query.name,
    makeResolver()
      .call(
        tsg
          .arrowFunc(
            [
              tsg.parameter('_'),
              tsg.parameter(`{${args.map(it => it.name).join(',')}}`),
              tsg.parameter('context'),
              tsg.parameter('info'),
            ],
            undefined,
            makeGQLQueryBody(entity, query),
          )
          .toAsync(),
      )
      .typeArgs(
        tsg
          .typeRef('GQLContext')
          .importFrom(Directory.resolve('GENERATED', 'BASE', 'context')),
        tsg.typeLiteral(
          args.map(it =>
            tsg.propertySignature(
              it.name,
              it.type === 'PagingOption'
                ? tsg.typeRef(it.type).importFrom('sasat')
                : tsg.typeRef(toTsType(it.type)),
            ),
          ),
        ),
      ),
  );
};

const qExpr = tsg.identifier('QExpr').importFrom('sasat');

const makeGQLQueryBody = (entity: EntityNode, query: GQLQuery) => {
  const fields = tsg.variable(
    'const',
    'fields',
    tsg
      .identifier('gqlResolveInfoToField')
      .importFrom('sasat')
      .call(tsg.identifier('info'))
      .as(makeTypeRef(entity.name, 'fields', 'GENERATED')),
  );
  const where =
    query.conditions && query.conditions.length !== 0
      ? tsg.variable(
          'const',
          'where',
          qExpr
            .property('conditions')
            .property('and')
            .call(...(query.conditions || []).map(makeQueryConditionExpr)),
        )
      : null;
  const method = {
    single: 'first',
    primary: entity.primaryQueryName(),
    'list-all': 'find',
    'list-paging': 'findPageable',
  } as const;
  const queryArgs = getArgs(query, entity);
  const primaryArgs =
    query.type === 'primary'
      ? queryArgs.map(it => tsg.identifier(it.name))
      : [];
  const args: TsExpression[] = [
    ...primaryArgs,
    query.type === 'list-paging'
      ? tsg
          .identifier('pagingOption')
          .importFrom('sasat')
          .call(tsg.identifier('option'))
      : null,
    tsg.identifier('fields'),
    tsg.identifier(where ? '{ where }' : 'undefined'),
    tsg.identifier('context'),
  ].filter(nonNullable);
  const result = makeDatasource(entity.name, DIR)
    .property(method[query.type])
    .call(...args);
  return tsg.block(fields, where, tsg.return(result));
};

const makeQueryBody = (node: QueryNode) => {
  if (node.type === 'primary') return makePrimaryQuery(node);
  return tsg.block(...makeListQuery(node));
};

const makePrimaryQuery = (node: QueryNode): TsExpression => {
  return makeDatasource(node.entityName, 'GENERATED')
    .property(node.dsMethodName)
    .call(
      ...node.args.map(it => tsg.identifier(it.name)),
      tsg
        .identifier('gqlResolveInfoToField')
        .importFrom('sasat')
        .call(tsg.identifier('info'))
        .as(makeTypeRef(node.entityName, 'fields', 'GENERATED')),
      tsg.identifier('undefined'),
      tsg.identifier('context'),
    );
};

const makeListQuery = (node: QueryNode) => {
  if (node.pageable) return makeListPagingQuery(node);
  return makeListAllQuery(node);
};

const makeListQueryField = (node: QueryNode) => {
  return tsg.variable(
    'const',
    fields,
    tsg
      .identifier('gqlResolveInfoToField')
      .call(tsg.identifier('info'))
      .typeArgs(makeTypeRef(node.entityName, 'fields', 'GENERATED')),
  );
};

const makeListQueryDataSource = (node: QueryNode) => {
  return makeDatasource(node.entityName, 'GENERATED');
};

const makeListAllQuery = (node: QueryNode) => {
  return [
    makeListQueryField(node),
    tsg.return(
      makeListQueryDataSource(node)
        .property(node.dsMethodName)
        .call(fields, tsg.identifier('undefined'), tsg.identifier('context')),
    ),
  ];
};

const makeListPagingQuery = (node: QueryNode) => {
  const option = tsg.identifier('option');
  const expr = tsg.identifier('QExpr').importFrom('sasat');

  return [
    makeListQueryField(node).addImport(['PagingOption'], 'sasat'),
    tsg.variable(
      'const',
      'sort',
      tsg.ternary(
        option.property('order'),
        tsg.array([
          expr
            .property('sort')
            .call(
              expr
                .property('field')
                .call(tsg.string('t1'), option.property('order')),
              tsg.ternary(
                tsg.binary(
                  tsg.identifier('option?').property('asc'),
                  '===',
                  tsg.identifier('false'),
                ),
                tsg.string('DESC'),
                tsg.string('ASC'),
              ),
            ),
        ]),
        tsg.array([]),
      ),
    ),
    tsg.return(
      makeListQueryDataSource(node)
        .property('findPageable') // todo move
        .call(
          tsg.object(
            tsg.propertyAssign('numberOfItem', option.property('numberOfItem')),
            tsg.propertyAssign('offset', option.property('offset')),
            tsg.propertyAssign('sort'),
          ),
          fields,
          tsg.identifier('undefined'),
          tsg.identifier('context'),
        ),
    ),
  ];
};
