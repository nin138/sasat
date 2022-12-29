import { RootNode } from '../../nodes/rootNode.js';
import { PropertyAssignment, TsFile, tsg } from '../../../tsg/index.js';
import {
  EntityNode,
  ReferencedNode,
  ReferenceNode,
} from '../../nodes/entityNode.js';
import { EntityName } from '../../../parser/node/entityName.js';
import { makeDatasource } from './scripts/makeDatasource.js';
import { makeFindQueryName } from '../names.js';

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
      ...node.references
        .filter(it => it.isGQLOpen)
        .map(ref => makeRelationProperty(ref)),
      ...node.referencedBy
        .filter(it => it.isGQLOpen)
        .map(ref => makeReferencedByProperty(ref)),
    ),
  );
};

const makeRelationProperty = (ref: ReferenceNode) => {
  const parentEntity = EntityName.fromTableName(ref.parentTableName);
  const paramName = parentEntity.lowerCase();
  return tsg.propertyAssign(
    ref.fieldName,
    tsg.arrowFunc(
      [
        tsg.parameter(
          paramName,
          tsg.typeRef(parentEntity.resultType()).importFrom('./relationMap'),
        ),
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
        tsg.return(
          makeDatasource(parentEntity, 'GENERATED')
            .property(makeFindQueryName([parentEntity.name]))
            .call(tsg.identifier(paramName)),
        ),
      ),
    ),
  );
};

const makeReferencedByProperty = (ref: ReferencedNode) => {
  const child = EntityName.fromTableName(ref.childTable);
  const paramName = child.lowerCase();
  const propertyName = ref.fieldName;
  return tsg.propertyAssign(
    propertyName,
    tsg.arrowFunc(
      [
        tsg.parameter(
          paramName,
          tsg.typeRef(child.resultType()).importFrom('./relationMap'),
        ),
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
        tsg.return(
          makeDatasource(ref.entity.name, 'GENERATED')
            .property(makeFindQueryName([child.name]))
            .call(tsg.identifier(paramName)),
        ),
      ),
    ),
  );
};
