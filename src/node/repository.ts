import { EntityNode } from './entity';
import { FindMethodNode } from './findMethod';
import { EntityName } from '../entity/entityName';

export class RepositoryNode {
  constructor(
    readonly tableName: string,
    readonly entityName: EntityName,
    readonly primaryKeys: string[],
    readonly entity: EntityNode,
    readonly findMethods: FindMethodNode[],
    readonly autoIncrementColumn?: string,
  ) {}

  getDefaultValueColumnNames(): string[] {
    return this.entity.hasDefaultValueFields().map(it => it.fieldName);
  }

  primaryFindMethod(): FindMethodNode {
    return this.findMethods.find(it => it.isPrimary)!;
  }
}
