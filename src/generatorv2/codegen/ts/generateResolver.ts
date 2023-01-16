import { RootNode } from '../../nodes/rootNode.js';
import { PropertyAssignment, TsFile, tsg } from '../../../tsg/index.js';
import {
  EntityNode,
  FieldNode,
  ReferencedNode,
  ReferenceNode,
} from '../../nodes/entityNode.js';
import { EntityName } from '../../nodes/entityName.js';
import { makeDatasource } from './scripts/makeDatasource.js';
import {
  makeContextTypeRef,
  makeTypeRef,
} from './scripts/getEntityTypeRefs.js';
import { Directory } from '../../directory.js';
import { tsFileNames } from './tsFileNames.js';

export const generateResolver = (root: RootNode): TsFile => {
  const hasSubscription = root.subscriptions.some(it => it.gqlEnabled);
  const properties = [
    tsg.propertyAssign('Query', tsg.identifier('query').importFrom('./query')),
    tsg.propertyAssign(
      'Mutation',
      tsg.identifier('mutation').importFrom('./mutation'),
    ),
  ];
  if (hasSubscription)
    properties.push(
      tsg.propertyAssign(
        'Subscription',
        tsg.identifier('subscription').importFrom('./subscription'),
      ),
    );
  return new TsFile(
    tsg
      .variable(
        'const',
        tsg.identifier('resolvers'),
        tsg.object(
          ...properties,
          tsg.spreadAssign(
            tsg.object(
              ...root.entities
                .filter(it => it.gqlEnabled)
                .map(makeEntityResolver),
            ),
          ),
        ),
      )
      .export(),
  ).disableEsLint();
};

const makeEntityResolver = (node: EntityNode): PropertyAssignment => {
  return tsg.propertyAssign(
    node.name.name,
    tsg.object(
      ...node.fields
        .filter(it => it.option.autoIncrementHashId)
        .map(makeHashIdProperty),
      ...node.references
        .filter(it => it.isGQLOpen)
        .map(ref => makeRelationProperty(ref)),
      ...node.referencedBy
        .filter(it => it.isGQLOpen)
        .map(ref => makeReferencedByProperty(ref)),
    ),
  );
};

const makeHashIdProperty = (field: FieldNode): PropertyAssignment => {
  const paramName = field.entity.name.lowerCase();
  return tsg.propertyAssign(
    field.fieldName,
    tsg.arrowFunc(
      [
        tsg.parameter(
          paramName,
          makeTypeRef(field.entity.name, 'result', 'GENERATED'),
        ),
      ],
      undefined,
      tsg
        .identifier(field.entity.name.IDEncoderName())
        .importFrom(Directory.resolve('GENERATED', 'BASE', tsFileNames.encoder))
        .property('encode')
        .call(tsg.identifier(paramName).property(field.fieldName)),
    ),
  );
};

const makeRelationProperty = (ref: ReferenceNode) => {
  const paramName = ref.entity.name.lowerCase();
  return tsg.propertyAssign(
    ref.fieldName,
    tsg.arrowFunc(
      [
        tsg.parameter(
          paramName,
          makeTypeRef(ref.entity.name, 'result', 'GENERATED'),
        ),
        tsg.parameter('context', makeContextTypeRef('GENERATED')),
      ],
      undefined,
      tsg.block(
        tsg.if(
          tsg.binary(
            tsg.identifier(paramName).property(ref.fieldName),
            '!==',
            tsg.identifier('undefined'),
          ),
          tsg.return(tsg.identifier(paramName).property(ref.fieldName)),
        ),
        tsg.variable(
          'const',
          'ds',
          makeDatasource(
            EntityName.fromTableName(ref.parentTableName),
            'GENERATED',
          ),
        ),
        tsg.variable(
          'const',
          'where',
          tsg
            .identifier('ds')
            .property('getRelationMap')
            .call()
            .property(ref.fieldName)
            .property('condition')
            .call(
              tsg.object(
                tsg.propertyAssign('parent', tsg.identifier(paramName)),
                tsg.propertyAssign('childTableAlias', tsg.string('t0')),
                tsg.propertyAssign('context'),
              ),
            ),
        ),
        tsg.return(
          tsg
            .identifier('ds')
            .property('first')
            .call(
              tsg.identifier('undefined'),
              tsg.object(tsg.propertyAssign('where')),
            ),
        ),
      ),
    ),
  );
};

const makeReferencedByProperty = (ref: ReferencedNode) => {
  const paramName = ref.entity.name.lowerCase();
  const propertyName = ref.fieldName;
  return tsg.propertyAssign(
    propertyName,
    tsg.arrowFunc(
      [
        tsg.parameter(
          paramName,
          makeTypeRef(ref.entity.name, 'result', 'GENERATED'),
        ),
        tsg.parameter('context', makeContextTypeRef('GENERATED')),
      ],
      undefined,
      tsg.block(
        tsg.if(
          tsg.binary(
            tsg.identifier(paramName).property(propertyName),
            '!==',
            tsg.identifier('undefined'),
          ),
          tsg.return(tsg.identifier(paramName).property(propertyName)),
        ),
        tsg.variable(
          'const',
          'ds',
          makeDatasource(EntityName.fromTableName(ref.childTable), 'GENERATED'),
        ),
        tsg.variable(
          'const',
          'where',
          tsg
            .identifier('ds')
            .property('getRelationMap')
            .call()
            .property(propertyName)
            .property('condition')
            .call(
              tsg.object(
                tsg.propertyAssign('parent', tsg.identifier(paramName)),
                tsg.propertyAssign('childTableAlias', tsg.string('t0')),
                tsg.propertyAssign('context'),
              ),
            ),
        ),
        tsg.return(
          tsg
            .identifier('ds')
            .property(ref.isArray ? 'find' : 'first')
            .call(
              tsg.identifier('undefined'),
              tsg.object(tsg.propertyAssign('where')),
            ),
        ),
      ),
    ),
  );
};
