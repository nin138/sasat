import { Directory } from '../../../constants/directory';
import { RepositoryNode } from '../../../node/repositoryNode';
import { TsFile } from '../file';
import { tsg } from '../code/factory';

export class RepositoryGenerator {
  generate(node: RepositoryNode): TsFile {
    return new TsFile(
      tsg
        .class(node.entityName.dataSourceName())
        .extends(
          tsg.extends(
            tsg
              .typeRef(node.entityName.generatedDataSourceName())
              .importFrom(Directory.generatedDataSourcePath(Directory.paths.dataSource, node.entityName)),
          ),
        )
        .export(),
    );
  }
}
