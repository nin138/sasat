import { Directory } from '../../../constants/directory.js';
import { TsFile } from '../file.js';
import { tsg } from '../code/factory.js';
import { RepositoryNode } from '../../../parser/node/repositoryNode.js';

export class RepositoryGenerator {
  generate(node: RepositoryNode): TsFile {
    return new TsFile(
      tsg
        .class(node.entityName.dataSourceName())
        .extends(
          tsg.extends(
            tsg
              .typeRef(node.entityName.generatedDataSourceName())
              .importFrom(
                Directory.generatedDBDataSourcePath(
                  Directory.paths.dataSource.db,
                  node.entityName,
                ),
              ),
          ),
        )
        .export(),
    );
  }
}
