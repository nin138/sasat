import { TsFile } from './file';
import { tsg } from './code/factory';
import { Directory } from '../../constants/directory';
import { RootNode } from '../../parser/node/rootNode';

export class FieldGenerator {
  generate(root: RootNode): TsFile {
    return new TsFile(
      ...root
        .entities()
        .map(it =>
          tsg
            .typeAlias(
              `${it.entityName}Fields`,
              tsg.typeLiteral([
                tsg.propertySignature(
                  'fields',
                  tsg.arrayType(
                    tsg
                      .typeRef(`keyof ${it.entityName}`)
                      .addImport([it.entityName.name], Directory.entityPath(Directory.paths.generated, it.entityName)),
                  ),
                ),
                tsg.propertySignature(
                  'relations?',
                  tsg.typeLiteral([
                    ...it.relations.map(it =>
                      tsg.propertySignature(`${it.refPropertyName()}?`, tsg.typeRef(`${it.toEntityName}Fields`)),
                    ),
                    ...it
                      .findReferencedRelations()
                      .map(it =>
                        tsg.propertySignature(
                          `${it.referencedByPropertyName()}?`,
                          tsg.typeRef(`${it.parent.entityName}Fields`),
                        ),
                      ),
                  ]),
                ),
              ]),
            )
            .export(),
        ),
    );
  }
}
