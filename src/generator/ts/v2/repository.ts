import { RepositoryNode } from '../../../node/repository';
import { dataSourceName, generatedDataSourceName } from '../../../constants/interfaceConstants';
import { getGeneratedRepositoryPath, RepositoryPath } from '../../../constants/directory';

export const generateRepositoryString = (ir: RepositoryNode) => `
import { ${generatedDataSourceName(ir.entityName)} } from '${getGeneratedRepositoryPath(
  RepositoryPath,
  ir.entityName,
)}';

export class ${dataSourceName(ir.entityName)} extends ${generatedDataSourceName(ir.entityName)} {}
`;
