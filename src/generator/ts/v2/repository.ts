import { RepositoryNode } from '../../../node/repository';
import { getGeneratedRepositoryPath, RepositoryPath } from '../../../constants/directory';

export const generateRepositoryString = (ir: RepositoryNode) => `
import { ${ir.entityName.generatedDataSourceName()} } from '${getGeneratedRepositoryPath(
  RepositoryPath,
  ir.entityName.name,
)}';

export class ${ir.entityName.dataSourceName()} extends ${ir.entityName.generatedDataSourceName()} {}
`;
