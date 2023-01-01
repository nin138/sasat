import { RootNode } from '../../nodes/rootNode.js';
import {
  KeywordTypeNode,
  PropertySignature,
  TsFile,
  tsg,
} from '../../../tsg/index.js';
import {
  EntityNode,
  ReferencedNode,
  ReferenceNode,
} from '../../nodes/entityNode.js';
import { EntityName } from '../../nodes/entityName.js';
import {
  makeContextTypeRef,
  makeTypeRef,
} from './scripts/getEntityTypeRefs.js';
import { ConditionValue } from '../../nodes/ConditionNode.js';
import { QExpr } from '../../../runtime/dsl/factory.js';
import { nonNullableFilter } from '../../../util/type.js';

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
      tsg
        .typeRef('RelationMap', [makeContextTypeRef('GENERATED')])
        .importFrom('sasat'),
    )
    .export();
};

const makeJoinConditionThrowExpressions = (cv: ConditionValue) => {
  if (cv.type !== 'context') return null;
  if (cv.onNotDefined.action !== 'error') return null;
  return tsg.if(
    tsg.binary(
      tsg.identifier('!context'),
      '||',
      tsg.binary(
        tsg.identifier('context').property(cv.field),
        '===',
        tsg.identifier('undefined'),
      ),
    ),
    tsg.throw(
      tsg.new(tsg.identifier('Error'), tsg.string(cv.onNotDefined.message)),
    ),
  );
};

const makeEntityRelationMap = (node: EntityNode) => {
  const makeOn = (ref: ReferenceNode | ReferencedNode) => {
    const parentTable = 'parentTableAlias';
    const childTable = 'childTableAlias';
    const conditionValueQExpr = (cv: ConditionValue) => {
      if (cv.type === 'context') {
        const value = tsg.identifier('context?').property(cv.field);
        if (cv.onNotDefined.action !== 'defaultValue') {
          return value;
        }
        return tsg.binary(
          tsg.identifier('context?').property(cv.field),
          '||',
          typeof cv.onNotDefined.value === 'string'
            ? tsg.string(cv.onNotDefined.value)
            : tsg.number(cv.onNotDefined.value),
        );
      }
      return qExpr
        .property('field')
        .call(
          tsg.identifier(cv.type === 'parent' ? parentTable : childTable),
          tsg.string(cv.field),
        );
    };
    return tsg.propertyAssign(
      'on',
      tsg.arrowFunc(
        [
          tsg.parameter(parentTable, KeywordTypeNode.string),
          tsg.parameter(
            ref.joinCondition.some(
              it => it.left.type === 'child' || it.right.type === 'child',
            )
              ? childTable
              : '_',
            KeywordTypeNode.string,
          ),
          ref.joinCondition.some(
            it => it.left.type === 'context' || it.right.type === 'context',
          )
            ? tsg.parameter('context?', makeContextTypeRef('GENERATED'))
            : null,
        ].filter(nonNullableFilter),
        tsg.typeRef('BooleanValueExpression').importFrom('sasat'),
        tsg.block(
          ...ref.joinCondition
            .flatMap(it => [
              makeJoinConditionThrowExpressions(it.left),
              makeJoinConditionThrowExpressions(it.right),
            ])
            .filter(nonNullableFilter),
          tsg.return(
            qExpr
              .property('conditions')
              .property('and')
              .call(
                ...ref.joinCondition.map(it =>
                  qExpr
                    .property('conditions')
                    .property('comparison')
                    .call(
                      conditionValueQExpr(it.left),
                      tsg.string(it.operator),
                      conditionValueQExpr(it.right),
                    ),
                ),
              ),
          ),
        ),
      ),
    );
  };
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
            makeOn(ref),
            tsg.propertyAssign('relation', tsg.string('One')),
          ),
        ),
      ),
      ...node.referencedBy.map(rel =>
        tsg.propertyAssign(
          rel.fieldName,
          tsg.object(
            tsg.propertyAssign('table', tsg.string(rel.childTable)),
            makeOn(rel),
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
      makeTypeRef(node.entity.name, 'identifiable', 'GENERATED'),
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
