import { RootNode } from '../../../nodes/rootNode.js';
import { PropertySignature, TsFile, tsg } from '../../../../tsg/index.js';
import {
  EntityNode,
  ReferencedNode,
  ReferenceNode,
} from '../../../nodes/entityNode.js';
import { EntityName } from '../../../nodes/entityName.js';
import {
  makeContextTypeRef,
  makeTypeRef,
} from './../scripts/getEntityTypeRefs.js';
import { makeCondition } from './makeCondition.js';

export const generateRelationMap = (root: RootNode) => {
  return new TsFile(
    makeRelationMap(root),
    makeTableInfo(root),
    ...root.entities.flatMap(entityRelationType),
  ).disableEsLint();
};

const makeRelationMap = (root: RootNode) => {
  return tsg
    .variable(
      'const',
      tsg.identifier('relationMap'),
      tsg.object(...root.entities.map(it => makeEntityRelationMap(it))),
      tsg
        .typeRef('RelationMap', [makeContextTypeRef('GENERATED')])
        .importFrom('sasat'),
    )
    .export();
};

const makeEntityRelationMap = (node: EntityNode) => {
  return tsg.propertyAssign(
    node.tableName,
    tsg.object(
      ...node.references.map(ref =>
        tsg.propertyAssign(
          ref.fieldName,
          tsg.object(
            tsg.propertyAssign('table', tsg.string(ref.parentTableName)),
            makeCondition(node, ref),
            // tsg.propertyAssign('relation', tsg.string('One')),
            tsg.propertyAssign('array', tsg.boolean(ref.isArray)),
            tsg.propertyAssign('nullable', tsg.boolean(ref.isNullable)),
          ),
        ),
      ),
      ...node.referencedBy.map(rel =>
        tsg.propertyAssign(
          rel.fieldName,
          tsg.object(
            tsg.propertyAssign('table', tsg.string(rel.childTable)),
            makeCondition(node, rel),
            // tsg.propertyAssign('relation', tsg.string(rel.relation)),
            tsg.propertyAssign('array', tsg.boolean(rel.isArray)),
            tsg.propertyAssign('nullable', tsg.boolean(rel.isNullable)),
          ),
        ),
      ),
    ),
  );
};

const makeTableInfo = (root: RootNode) => {
  const columnMap = (entity: EntityNode) =>
    tsg.propertyAssign(
      'columnMap',
      tsg.object(
        ...entity.fields.map(field =>
          tsg.propertyAssign(field.fieldName, tsg.string(field.columnName)),
        ),
      ),
    );
  return tsg
    .variable(
      'const',
      'tableInfo',
      tsg.object(
        ...root.entities.map(entity =>
          tsg.propertyAssign(
            entity.tableName,
            tsg.object(
              tsg.propertyAssign(
                'identifiableKeys',
                tsg.array(entity.identifyKeys.map(tsg.string)),
              ),
              columnMap(entity),
            ),
          ),
        ),
      ),
      tsg.typeRef('TableInfo').importFrom('sasat'),
    )
    .export();
};

const referenceRelationType = (ref: ReferenceNode) => {
  const parentEntityName = EntityName.fromTableName(ref.parentTableName);
  const type = tsg
    .typeRef('EntityResult', [
      tsg.typeRef(parentEntityName.entityWithRelationTypeName()),
      tsg.typeRef(parentEntityName.relationTypeName()),
    ])
    .importFrom('sasat');
  return tsg.propertySignature(ref.fieldName, type);
};

const referencedRelationType = (node: ReferencedNode): PropertySignature => {
  const child = EntityName.fromTableName(node.childTable);
  const type = tsg
    .typeRef('EntityResult', [
      tsg.typeRef(child.entityWithRelationTypeName()),
      makeTypeRef(child, 'identifiable', 'GENERATED'),
    ])
    .importFrom('sasat');

  return tsg.propertySignature(
    node.fieldName,
    node.isArray ? tsg.arrayType(type) : type,
  );
};

const entityRelationType = (node: EntityNode) => {
  const typeProperties = [
    ...node.references.map(referenceRelationType),
    ...node.referencedBy.map(referencedRelationType),
  ];
  return [
    tsg
      .typeAlias(
        node.name.relationTypeName(),
        typeProperties.length !== 0
          ? tsg.typeLiteral(typeProperties)
          : tsg.typeRef('Record<never, never>'),
      )
      .export(),
    tsg
      .typeAlias(
        node.name.entityWithRelationTypeName(),
        tsg.intersectionType(
          makeTypeRef(node.name, 'entity', 'GENERATED'),
          tsg.typeRef(node.name.relationTypeName()),
        ),
      )
      .export(),
    tsg
      .typeAlias(
        node.name.resultType(),
        tsg
          .typeRef('EntityResult', [
            tsg.typeRef(node.name.entityWithRelationTypeName()),
            makeTypeRef(node.name, 'identifiable', 'GENERATED'),
          ])
          .importFrom('sasat'),
      )
      .export(),
  ];
};
