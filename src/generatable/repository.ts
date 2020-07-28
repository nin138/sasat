import { IrRepository } from '../ir/repository';

export class RepositoryNode {
  readonly entityName: string;
  constructor(readonly data: IrRepository) {}
}
