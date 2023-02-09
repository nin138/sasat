import { RootNode } from '../../nodes/rootNode.js';
import {
  PropertyAssignment,
  TsExpression,
  TsFile,
  tsg,
  TsType,
} from '../../../tsg/index.js';
import {
  makeContextTypeRef,
  makeTypeRef,
} from './scripts/getEntityTypeRefs.js';
import { makeDatasource } from './scripts/makeDatasource.js';
import { Directories, Directory } from '../../directory.js';
import { nonNullable } from '../../../runtime/util.js';
import { EntityNode } from '../../nodes/entityNode.js';
import { getArgs, GQLQuery } from '../../../migration/data/GQLOption.js';
import { toTsType } from '../../scripts/gqlTypes.js';
import { makeQueryConditionExpr } from './scripts/makeQueryConditionExpr.js';
import {
  ArgQueryConditionValue,
  FieldQueryConditionValue,
} from '../../nodes/QueryConditionNode.js';
import { RawCodeStatement } from '../../../tsg/node/rawCodeStatement.js';
import { tsFileNames } from './tsFileNames.js';
import { Console } from '../../../cli/console.js';

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
const makeGQLQuery = (
  entity: EntityNode,
  query: GQLQuery,
): PropertyAssignment | null => {
  if (!entity.gqlEnabled) {
    Console.log(
      `Query.${
        query.name || entity.name.lowerCase()
      } generation skipped. Reason: Entity:${
        entity.name.name
      } is not Open to GQL.`,
    );
    return null;
  }
  const args = getArgs(query, entity);

  return tsg.propertyAssign(
    query.type === 'primary' ? entity.name.lowerCase() : query.name,
    makeResolver()
      .call(
        ...[
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
          makeMiddlewares(entity, query),
        ].filter(nonNullable),
      )
      .typeArgs(...makeTypeArgs(args)),
  );
};

type HashIdArg = {
  name: string;
  encoder: string;
};

const getHashIdArgs = (
  entity: EntityNode,
  query: GQLQuery,
): HashIdArg[] | null => {
  if (query.type === 'primary') {
    const hashIDs = entity
      .identifyFields()
      .filter(it => it.option.autoIncrementHashId);
    if (hashIDs.length === 0) return null;
    return hashIDs.map(it => ({
      encoder: it.hashId!.encoder,
      name: it.fieldName,
    }));
  }

  const getHashIdArg = (
    arg: ArgQueryConditionValue,
    field: FieldQueryConditionValue,
  ) => {
    const columnName = field.column;
    const hashIdOpt = entity.fields.find(
      e => e.columnName === columnName,
    )?.hashId;
    if (!hashIdOpt) return null;
    return {
      name: arg.name,
      encoder: hashIdOpt.encoder,
    };
  };
  return query.conditions
    .map(it => {
      if (it.kind === 'comparison') {
        if (it.left.kind === 'arg') {
          if (it.right.kind === 'field') {
            return getHashIdArg(it.left, it.right);
          }
        }
        if (it.right.kind === 'arg') {
          if (it.left.kind === 'field') {
            return getHashIdArg(it.right, it.left);
          }
        }
      }
      return null;
    })
    .filter(nonNullable);
};

const makeHashIdMiddleware = (
  entity: EntityNode,
  query: GQLQuery,
): TsExpression | null => {
  const args = getHashIdArgs(entity, query);
  if (!args || args?.length === 0) return null;
  return tsg.arrowFunc(
    [tsg.parameter('args')],
    undefined,
    tsg.block(
      new RawCodeStatement(
        `args[1] = {...args[1], ${args
          .map(
            it =>
              `${it.name}: ${it.encoder}.decode(args[1].${it.name} as string),`,
          )
          .join('')}};`,
      ).addImport(
        args.map(it => it.encoder),
        Directory.resolve(DIR, 'BASE', tsFileNames.encoder),
      ),
      tsg.return(tsg.identifier('args')),
    ),
  );
};

const makeMiddlewares = (entity: EntityNode, query: GQLQuery) => {
  const hashId = makeHashIdMiddleware(entity, query);
  if (!hashId && query.middlewares.length === 0) return null;
  if (query.middlewares.length === 0) return tsg.array([hashId!]);
  const middlewares = query.middlewares.map(it =>
    tsg.identifier(it).importFrom('../' + tsFileNames.middleware),
  );
  if (!hashId) return tsg.array(middlewares);
  return tsg.array([hashId, ...middlewares]);
};

const makeTypeArgs = (args: ArgQueryConditionValue[]): TsType[] => {
  let hashIds = false;
  const getType = (arg: ArgQueryConditionValue, checkHashId: boolean) => {
    if (arg.type === 'PagingOption')
      return tsg.typeRef(arg.type).importFrom('sasat');
    if (checkHashId && arg.type === 'ID') {
      hashIds = true;
      return tsg.typeRef('number');
    }
    return tsg.typeRef(toTsType(arg.type));
  };
  const params = tsg.typeLiteral(
    args.map(it => tsg.propertySignature(it.name, getType(it, true))),
  );
  if (!hashIds) {
    return [makeContextTypeRef('GENERATED'), params];
  }
  return [
    makeContextTypeRef('GENERATED'),
    params,
    tsg.typeLiteral(
      args.map(it => tsg.propertySignature(it.name, getType(it, false))),
    ),
  ];
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
