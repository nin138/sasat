import { TsFile } from './file';
import { tsg } from './code/factory';
import { Relation } from '../..';
import { Directory } from '../../constants/directory';
import { EntityName } from '../../entity/entityName';
import { RootNode } from '../../parser/node/rootNode';
import { EntityNode } from '../../parser/node/entityNode';

export class RelationMapGenerator {
  generate(root: RootNode): TsFile {
    return new TsFile(
      this.relationMap(root),
      this.identifiableKeyMap(root),
      this.resolveFunc(),
      ...root.entities().flatMap(this.entityRelationType),
    );
  }

  private relationMap(root: RootNode) {
    return tsg
      .variable(
        'const',
        tsg.identifier('relationMap'),
        tsg.object(...root.entities().map(it => this.entityRelationMap(it))),
        tsg.typeRef(
          `{[from: string]: {[to: string]: {table: string, on: [[string, '=' | '>' | '<' | '>=' | '<=' | '<>', string]], relation: 'One' | 'OneOrZero' |'Many'}}}`,
        ),
      )
      .export();
  }

  private identifiableKeyMap(root: RootNode) {
    return tsg
      .variable(
        'const',
        'identifiableKeyMap',
        tsg.object(
          ...root.repositories.map(it => tsg.propertyAssign(it.tableName, tsg.array(it.primaryKeys.map(tsg.string)))),
        ),
        tsg.typeRef('Record<string, string[]>'),
      )
      .export();
  }

  private resolveFunc() {
    return tsg
      .variable(
        'const',
        tsg.identifier('resolveField'),
        tsg
          .identifier('createFieldResolver')
          .importFrom('sasat')
          .call(tsg.identifier('relationMap'), tsg.identifier('identifiableKeyMap')),
      )
      .export();
  }

  private entityRelationType(node: EntityNode) {
    const importEntity = (entity: EntityName) => Directory.entityPath(Directory.paths.generated, entity);
    return [
      tsg
        .typeAlias(
          node.entityName.relationTypeName(),
          tsg.typeLiteral([
            ...node.relations.map(it =>
              tsg.propertySignature(
                it.refPropertyName(),
                it.refType().toTsType().addImport([it.toEntityName.name], importEntity(it.toEntityName)),
              ),
            ),
            ...node
              .findReferencedRelations()
              .map(it =>
                tsg.propertySignature(
                  it.referencedByPropertyName(),
                  it
                    .referenceByType()
                    .toTsType()
                    .addImport([it.parent.entityName.name], importEntity(it.parent.entityName)),
                ),
              ),
          ]),
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
              node.entityName.identifiableTypeReference(Directory.paths.generated),
            ])
            .importFrom('sasat'),
        )
        .export(),
    ];
  }

  private entityRelationMap(node: EntityNode) {
    return tsg.propertyAssign(
      node.repository.tableName,
      tsg.object(
        ...node.relations.map(rel =>
          tsg.propertyAssign(
            rel.refPropertyName(),
            tsg.object(
              tsg.propertyAssign('table', tsg.string(rel.toTableName)),
              tsg.propertyAssign(
                'on',
                tsg.array([tsg.array([tsg.string(rel.fromColumn), tsg.string('='), tsg.string(rel.toColumn)])]),
              ),
              tsg.propertyAssign('relation', tsg.string(Relation.One)),
            ),
          ),
        ),
        ...node
          .findReferencedRelations()
          .map(rel =>
            tsg.propertyAssign(
              rel.referencedByPropertyName(),
              tsg.object(
                tsg.propertyAssign('table', tsg.string(rel.parent.repository.tableName)),
                tsg.propertyAssign(
                  'on',
                  tsg.array([tsg.array([tsg.string(rel.toColumn), tsg.string('='), tsg.string(rel.fromColumn)])]),
                ),
                tsg.propertyAssign('relation', tsg.string(rel.relation)),
              ),
            ),
          ),
      ),
    );
  }
}
