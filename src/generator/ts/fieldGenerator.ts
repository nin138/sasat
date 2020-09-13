import { TsFile } from './file';
import { tsg } from './code/factory';
import { Directory } from '../../constants/directory';
import { RootNode } from '../../parser/node/rootNode';
import { EntityNode } from '../../parser/node/entityNode';

export class FieldGenerator {
  generate(root: RootNode): TsFile {
    return new TsFile(
      ...root
        .entities()
        .map(it =>
          tsg
            .typeAlias(
              `${it.entityName}Fields`,
              tsg.intersectionType(tsg.typeRef('Fields').importFrom('sasat'), this.typeLiteral(it)),
            )
            .export(),
        ),
    );
  }
  private typeLiteral(entity: EntityNode) {
    return tsg.typeLiteral([
      tsg.propertySignature(
        'fields',
        tsg.arrayType(
          tsg
            .typeRef(`keyof ${entity.entityName}`)
            .addImport([entity.entityName.name], Directory.entityPath(Directory.paths.generated, entity.entityName)),
        ),
      ),
      tsg.propertySignature(
        'relations?',
        tsg.typeLiteral([
          ...entity.relations.map(it =>
            tsg.propertySignature(`${it.refPropertyName()}?`, tsg.typeRef(`${it.toEntityName}Fields`)),
          ),
          ...entity
            .findReferencedRelations()
            .map(it =>
              tsg.propertySignature(`${it.referencedByPropertyName()}?`, tsg.typeRef(`${it.parent.entityName}Fields`)),
            ),
        ]),
      ),
    ]);
  }
}
