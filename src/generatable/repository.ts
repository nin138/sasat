import { IrRepository } from '../ir/repository';
import { EntityNode } from './entity';

export class RepositoryNode {
  readonly entityName: string;
  readonly primaryKeys: string[];
  readonly autoIncrementColumn?: string;
  readonly entity: EntityNode;
  constructor(readonly data: IrRepository) {}

  getDefaultValueColumnNames(): string[] {
    return [];
  }
}
