import { IrRepository } from '../ir/repository';
import { EntityNode } from './entity';
import { FindMethodNode } from './findMethod';

export class RepositoryNode {
  readonly entityName: string;
  readonly primaryKeys: string[];
  readonly autoIncrementColumn?: string;
  readonly entity: EntityNode;
  readonly findMethods: FindMethodNode[];
  constructor(readonly data: IrRepository) {}

  getDefaultValueColumnNames(): string[] {
    return [];
  }
}
