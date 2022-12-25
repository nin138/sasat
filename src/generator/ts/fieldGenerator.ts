import { TsFile } from '../../tsg/file.js';
import { tsg } from '../../tsg/index.js';
import { Directory } from '../../constants/directory.js';
import { RootNode } from '../../parser/node/rootNode.js';
import { EntityNode } from '../../parser/node/entityNode.js';

export class FieldGenerator {
  generate(root: RootNode): TsFile {
    return new TsFile(
      ...root
        .entities()
        .map(it =>
          tsg
            .typeAlias(
              `${it.entityName}Fields`,
              tsg
                .typeRef('Fields', [
                  it.entityName.getTypeReference(Directory.paths.generated),
                  this.typeLiteral(it),
                ])
                .importFrom('sasat'),
            )
            .export(),
        ),
    ).disableEsLint();
  }
  private typeLiteral(entity: EntityNode) {
    return tsg.typeLiteral([
      ...entity.relations.map(it =>
        tsg.propertySignature(
          `${it.refPropertyName()}?`,
          tsg.typeRef(`${it.to.entityName}Fields`),
        ),
      ),
      ...entity
        .findReferencedRelations()
        .map(it =>
          tsg.propertySignature(
            `${it.referencedByPropertyName()}?`,
            tsg.typeRef(`${it.parent.entityName}Fields`),
          ),
        ),
    ]);
  }
}
