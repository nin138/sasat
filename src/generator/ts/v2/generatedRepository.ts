import {
  baseRepositoryName,
  creatableInterfaceName,
  generatedDataSourceName,
  identifiableInterfaceName,
} from '../../../constants/interfaceConstants';
import { TsFile } from './file';
import { Class } from './code/node/class';
import { RepositoryNode } from '../../../generatable/repository';
import { ExtendsClause } from './code/node/extendsClause';
import { TypeReference } from './code/node/type/typeReference';
import {
  GeneratedRepositoryPath,
  getEntityPath,
} from '../../../constants/directory';

export class GeneratedRepositoryGenerator {
  constructor(private node: RepositoryNode) {}

  generate() {
    const node = this.node;
    const entityPath = getEntityPath(GeneratedRepositoryPath, node.entityName);
    return new TsFile(
      new Class(generatedDataSourceName(node.entityName))
        .export()
        .extends(
          new ExtendsClause(
            new TypeReference(baseRepositoryName(), [
              new TypeReference(node.entityName).importFrom(entityPath),
              new TypeReference(
                creatableInterfaceName(node.entityName),
              ).importFrom(entityPath),
              new TypeReference(
                identifiableInterfaceName(node.entityName),
              ).importFrom(entityPath),
            ]),
          ),
        ),
    );
  }
}
