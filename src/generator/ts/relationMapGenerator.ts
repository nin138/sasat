import { TsFile } from './file.js';
import { tsg } from './code/factory.js';
import { Directory } from '../../constants/directory.js';
import { RootNode } from '../../parser/node/rootNode.js';
import { EntityNode } from '../../parser/node/entityNode.js';
import { KeywordTypeNode } from './code/node/type/typeKeyword.js';
import { RelationNode } from '../../parser/node/relationNode.js';
import { PropertySignature } from './code/node/propertySignature.js';

export class RelationMapGenerator {
  generate(root: RootNode): TsFile {
    return new TsFile(
      this.relationMap(root),
      this.tableInfo(root),
      ...root.entities().flatMap(it => this.entityRelationType(it)),
    ).disableEsLint();
  }

  private relationMap(root: RootNode) {
    return tsg
      .variable(
        'const',
        tsg.identifier('relationMap'),
        tsg.object(...root.entities().map(it => this.entityRelationMap(it))),
        tsg.typeRef('RelationMap').importFrom('sasat'),
      )
      .export();
  }

  private referencedRelationType(node: RelationNode): PropertySignature {
    const type = tsg.typeRef('EntityResult', [
      tsg.typeRef(node.parent.entityName.entityWithRelationTypeName()),
      node.parent.entityName.identifiableTypeReference(
        Directory.paths.generated,
      ),
    ]).importFrom('sasat');

    return tsg.propertySignature(
      node.referencedByPropertyName(),
      node.relation === 'Many' ? tsg.arrayType(type) : type,
    );
  }

  private entityRelationType(node: EntityNode) {
    const typeProperties = [
      ...node.relations.map(it => {
        const type = tsg.typeRef('EntityResult', [
          tsg.typeRef(it.to.entityName.entityWithRelationTypeName()),
          tsg.typeRef(it.to.entityName.relationTypeName()),
        ])
          .importFrom('sasat');
         return tsg.propertySignature(
           it.refPropertyName(),
           type,
         );
      }),
      ...node
        .findReferencedRelations()
        .map(it => this.referencedRelationType(it)),
    ];
    return [
      tsg
        .typeAlias(
          node.entityName.relationTypeName(),
          typeProperties.length !== 0
            ? tsg.typeLiteral(typeProperties)
            : tsg.typeRef('Record<never, never>'),
        )
        .export(),
      tsg
        .typeAlias(
          node.entityName.entityWithRelationTypeName(),
          tsg.intersectionType(
            node.entityName.getTypeReference(Directory.paths.generated),
            tsg.typeRef(node.entityName.relationTypeName()),
          ),
        )
        .export(),
      tsg
        .typeAlias(
          node.entityName.resultType(),
          tsg
            .typeRef('EntityResult', [
              tsg.typeRef(node.entityName.entityWithRelationTypeName()),
              node.entityName.identifiableTypeReference(
                Directory.paths.generated,
              ),
            ])
            .importFrom('sasat'),
        )
        .export(),
    ];
  }

  private entityRelationMap(node: EntityNode) {
    const qExpr = tsg.identifier('QExpr').importFrom('sasat');
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
                .call(
                  tsg.identifier('childTableAlias'),
                  tsg.string(childColumn),
                ),
            ),
        ),
      );

    return tsg.propertyAssign(
      node.repository.tableName,
      tsg.object(
        ...node.relations.map(rel =>
          tsg.propertyAssign(
            rel.refPropertyName(),
            tsg.object(
              tsg.propertyAssign('table', tsg.string(rel.to.tableName)),
              on(rel.from.columnName, rel.to.columnName),
              tsg.propertyAssign('relation', tsg.string('One')),
            ),
          ),
        ),
        ...node
          .findReferencedRelations()
          .map(rel =>
            tsg.propertyAssign(
              rel.referencedByPropertyName(),
              tsg.object(
                tsg.propertyAssign(
                  'table',
                  tsg.string(rel.parent.repository.tableName),
                ),
                on(rel.to.columnName, rel.from.columnName),
                tsg.propertyAssign('relation', tsg.string(rel.relation)),
              ),
            ),
          ),
      ),
    );
  }

  private tableInfo(root: RootNode) {
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
          ...root.repositories.map(repo =>
            tsg.propertyAssign(
              repo.tableName,
              tsg.object(
                tsg.propertyAssign(
                  'identifiableKeys',
                  tsg.array(repo.primaryKeys.map(tsg.string)),
                ),
                columnMap(repo.entity),
              ),
            ),
          ),
        ),
        tsg.typeRef('TableInfo').importFrom('sasat')
      )
      .export();
  }
}
