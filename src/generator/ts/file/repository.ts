import { RepositoryNode } from '../../../node/repository';

export const generateRepositoryString = (ir: RepositoryNode) => `
import { Generated${ir.entityName}Repository } from '../__generated__/repository/${ir.entityName}';

export class ${ir.entityName}Repository extends Generated${ir.entityName}Repository {}
`;
