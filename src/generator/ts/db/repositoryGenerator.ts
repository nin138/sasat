import { Directory } from '../../../constants/directory';
import { TsFile } from '../file';
import { tsg } from '../code/factory';
import { RepositoryNode } from '../../../parser/node/repositoryNode';

export class RepositoryGenerator {
  generate(node: RepositoryNode): TsFile {
    return new TsFile(
      tsg
        .class(node.entityName.dataSourceName())
        .extends(
          tsg.extends(
            tsg
              .typeRef(node.entityName.generatedDataSourceName())
              .importFrom(Directory.generatedDBDataSourcePath(Directory.paths.dataSource.db, node.entityName)),
          ),
        )
        .export(),
    );
  }
}
