import { EntityNode } from './entity';
import { FindMethodNode } from './findMethod';

export class RepositoryNode {
  constructor(
    readonly entityName: string,
    readonly primaryKeys: string[],
    readonly entity: EntityNode,
    readonly findMethods: FindMethodNode[],
    readonly autoIncrementColumn?: string,
  ) {}

  getDefaultValueColumnNames(): string[] {
    return this.entity.hasDefaultValueFields().map(it => it.fieldName);
  }
}
