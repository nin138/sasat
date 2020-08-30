import { EntityNode } from './entityNode';
import { FindMethodNode } from './findMethod';
import { EntityName } from '../entity/entityName';
import { RootNode } from './rootNode';
import { TableHandler } from '../entity/table';
import { QueryNode } from './gql/queryNode';
import { MutationNode } from './gql/mutationNode';
import { QueryNodeFactory } from '../parser/nodeFactory/queryNodeFactory';
import { MutationNodeFactory } from '../parser/nodeFactory/mutationNodeFactory';

export class RepositoryNode {
  readonly tableName: string;
  readonly entityName: EntityName;
  readonly primaryKeys: string[];
  readonly entity: EntityNode;
  readonly autoIncrementColumn?: string;
  readonly queries: QueryNode[];
  readonly mutations: MutationNode[];
  constructor(readonly root: RootNode, table: TableHandler, readonly findMethods: FindMethodNode[]) {
    this.tableName = table.tableName;
    this.entityName = table.getEntityName();
    this.primaryKeys = table.primaryKey;
    this.entity = this.createEntity(table);
    this.autoIncrementColumn = table.columns.find(it => it.getData().autoIncrement)?.name;
    this.queries = new QueryNodeFactory().create(table);
    this.mutations = new MutationNodeFactory().create(table, this.entity);
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
