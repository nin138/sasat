import { EntityNode } from './entity';
import { FindMethodNode } from './findMethod';
import { EntityName } from '../entity/entityName';
import { RootNode } from './rootNode';
import { TableHandler } from '../entity/table';

export class RepositoryNode {
  readonly tableName: string;
  readonly entityName: EntityName;
  readonly primaryKeys: string[];
  readonly entity: EntityNode;
  readonly autoIncrementColumn?: string;
  constructor(readonly root: RootNode, table: TableHandler, readonly findMethods: FindMethodNode[]) {
    this.tableName = table.tableName;
    this.entityName = table.getEntityName();
    this.primaryKeys = table.primaryKey;
    this.entity = this.createEntity(table);
    this.autoIncrementColumn = table.columns.find(it => it.getData().autoIncrement)?.name;
  }
  private createEntity(table: TableHandler) {
    return new EntityNode(this, table);
  }

  getDefaultValueColumnNames(): string[] {
    return this.entity.hasDefaultValueFields().map(it => it.fieldName);
  }

  primaryFindMethod(): FindMethodNode {
    return this.findMethods.find(it => it.isPrimary)!;
  }
}
