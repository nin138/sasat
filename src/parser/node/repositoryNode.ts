import { EntityNode } from './entityNode';
import { FindMethodNode } from './findMethod';
import { RootNode } from './rootNode';
import { QueryNode } from './gql/queryNode';
import { MutationNode } from './gql/mutationNode';
import { MutationNodeFactory } from '../nodeFactory/mutationNodeFactory';
import { QueryNodeFactory } from '../nodeFactory/queryNodeFactory';
import { TableHandler } from '../../migration/serializable/table';
import { EntityName } from './entityName';
import { RelationNode } from './relationNode';
import { ParameterNode } from './parameterNode';
import { TypeNode } from './typeNode';
import { Relation } from '../..';

export class RepositoryNode {
  readonly tableName: string;
  readonly entityName: EntityName;
  readonly primaryKeys: string[];
  readonly entity: EntityNode;
  readonly autoIncrementColumn?: string;
  readonly queries: QueryNode[];
  readonly mutations: MutationNode[];
  constructor(readonly root: RootNode, table: TableHandler) {
    this.tableName = table.tableName;
    this.entityName = table.getEntityName();
    this.primaryKeys = table.primaryKey;
    this.entity = this.createEntity(table);
    this.autoIncrementColumn = table.columns.find(it => it.serialize().autoIncrement)?.columnName();
    this.queries = new QueryNodeFactory().create(table);
    this.mutations = new MutationNodeFactory().create(table, this.entity);
  }
  private createEntity(table: TableHandler) {
    return new EntityNode(this, table);
  }

  getDefaultValueColumnNames(): string[] {
    return this.entity.hasDefaultValueFields().map(it => it.fieldName);
  }

  findMethods(): FindMethodNode[] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const node: RepositoryNode = this;
    const unique = (nodes: FindMethodNode[]) => {
      const names: string[] = [];
      return nodes.filter(it => {
        if (names.includes(it.name)) return false;
        names.push(it.name);
        return true;
      });
    };

    const refMethods = (relation: RelationNode) => {
      return new FindMethodNode(
        [
          new ParameterNode(
            relation.fromColumn,
            new TypeNode(relation.parent.field(relation.fromColumn).dbType, false, false),
          ),
        ],
        new TypeNode(
          EntityName.fromTableName(relation.parent.repository.tableName),
          relation.relation === Relation.Many,
          false,
        ),
        false,
      );
    };
    const referencedByMethod = (relation: RelationNode) => {
      const to = relation.parent.repository.root.findRepository(relation.toEntityName);
      return new FindMethodNode(
        [new ParameterNode(relation.toColumn, new TypeNode(to.entity.field(relation.toColumn).dbType, false, false))],
        new TypeNode(relation.toEntityName, false, false),
        false,
      );
    };
    const methods = [
      new FindMethodNode(
        node.primaryKeys.map(it => {
          const field = node.entity.field(it)!;
          return new ParameterNode(it, new TypeNode(field.dbType, false, false));
        }),
        new TypeNode(node.entityName, false, true),
        true,
      ),
      ...node.entity.relations.map(refMethods),
      ...node.entity.findReferencedRelations().map(referencedByMethod),
    ];
    return unique(methods);
  }
}
