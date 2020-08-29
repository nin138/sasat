import { Directory } from '../../../constants/directory';
import { RepositoryNode } from '../../../node/repositoryNode';

export const generateRepositoryString = (ir: RepositoryNode) => `
import { ${ir.entityName.generatedDataSourceName()} } from '${Directory.generatedDataSourcePath(
  Directory.paths.dataSource,
  ir.entityName.name,
)}';

export class ${ir.entityName.dataSourceName()} extends ${ir.entityName.generatedDataSourceName()} {}
`;
