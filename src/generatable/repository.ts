import { IrRepository } from '../ir/repository';

export class RepositoryNode {
  readonly entityName: string;
  readonly primaryKeys: string[];
  readonly autoIncrementColumn?: string;
  constructor(readonly data: IrRepository) {}
}
