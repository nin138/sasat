import { RootNode } from '../../nodes/rootNode.js';
import {
  KeywordTypeNode,
  PropertySignature,
  TsFile,
  tsg,
} from '../../../tsg/index.js';
import { Directory } from '../../../constants/directory.js';
import { EntityNode, ReferencedNode } from '../../nodes/entityNode.js';
import { EntityName } from '../../../parser/node/entityName.js';

// TODO refactor
const qExpr = tsg.identifier('QExpr').importFrom('sasat');

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
      tsg.typeRef('RelationMap').importFrom('sasat'),
    )
    .export();
};

const makeEntityRelationMap = (node: EntityNode) => {
  const on = (parentColumn: string, childColumn: string) =>
    tsg.propertyAssign(
      'on',
      tsg.arrowFunc(
        [
          tsg.parameter('parentTableAlias', KeywordTypeNode.string),
          tsg.parameter('childTableAlias', KeywordTypeNode.string),
          // tsg.parameter('context?', KeywordTypeNode.any),
        ],
        tsg.typeRef('BooleanValueExpression').importFrom('sasat'),
        qExpr
          .property('conditions')
          .property('eq')
          .call(
            qExpr
              .property('field')
              .call(
                tsg.identifier('parentTableAlias'),
                tsg.string(parentColumn),
              ),
            qExpr
              .property('field')
              .call(tsg.identifier('childTableAlias'), tsg.string(childColumn)),
          ),
      ),
    );

  return tsg.propertyAssign(
    node.tableName,
    tsg.object(
      ...node.references.map(ref =>
        tsg.propertyAssign(
          ref.fieldName,
          tsg.object(
            tsg.propertyAssign('table', tsg.string(ref.parentTableName)),
            on(ref.columnName, ref.columnName),
            tsg.propertyAssign('relation', tsg.string('One')),
          ),
        ),
      ),
      ...node.referencedBy.map(rel =>
        tsg.propertyAssign(
          rel.fieldName,
          tsg.object(
            tsg.propertyAssign('table', tsg.string(rel.childTable)),
            on(rel.columnName, rel.childColumn),
            tsg.propertyAssign('relation', tsg.string(rel.relation)),
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

const referencedRelationType = (node: ReferencedNode): PropertySignature => {
  const type = tsg
    .typeRef('EntityResult', [
      tsg.typeRef(node.entity.name.entityWithRelationTypeName()),
      node.entity.name.identifiableTypeReference(Directory.paths.generated),
    ])
    .importFrom('sasat');

  return tsg.propertySignature(
    node.fieldName,
    node.relation === 'Many' ? tsg.arrayType(type) : type,
  );
};

const entityRelationType = (node: EntityNode) => {
  const typeProperties = [
    ...node.references.map(it => {
      const parentEntityName = EntityName.fromTableName(it.parentTableName);
      const type = tsg
        .typeRef('EntityResult', [
          tsg.typeRef(parentEntityName.entityWithRelationTypeName()),
          tsg.typeRef(parentEntityName.relationTypeName()),
        ])
        .importFrom('sasat');
      return tsg.propertySignature(it.fieldName, type);
    }),
    ...node.referencedBy.map(it => referencedRelationType(it)),
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
          node.name.getTypeReference(Directory.paths.generated),
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
            node.name.identifiableTypeReference(Directory.paths.generated),
          ])
          .importFrom('sasat'),
      )
      .export(),
  ];
};
