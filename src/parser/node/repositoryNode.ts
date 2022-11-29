import { EntityNode } from './entityNode.js';
import { FindMethodNode } from './findMethod.js';
import { RootNode } from './rootNode.js';
import { QueryNode } from './gql/queryNode.js';
import { MutationNode } from './gql/mutationNode.js';
import { MutationNodeFactory } from '../nodeFactory/mutationNodeFactory.js';
import { QueryNodeFactory } from '../nodeFactory/queryNodeFactory.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { EntityName } from './entityName.js';
import { RelationNode } from './relationNode.js';
import { ParameterNode } from './parameterNode.js';
import { EntityTypeNode } from './typeNode.js';
import {GQLOption} from "../../migration/data/GQLOption.js";

export class RepositoryNode {
  readonly tableName: string;
  readonly entityName: EntityName;
  readonly primaryKeys: string[];
  readonly entity: EntityNode;
  readonly autoIncrementColumn?: string;
  readonly queries: QueryNode[];
  readonly mutations: MutationNode[];
  readonly gqlOption: GQLOption;
  constructor(readonly root: RootNode, table: TableHandler) {
    this.tableName = table.tableName;
    this.entityName = table.getEntityName();
    this.primaryKeys = table.primaryKey.map(it => table.column(it).fieldName());
    this.entity = this.createEntity(table);
    this.autoIncrementColumn = table.columns
      .find(it => it.serialize().autoIncrement)
      ?.fieldName();
    this.queries = new QueryNodeFactory().create(table, table.gqlOption);
    this.mutations = new MutationNodeFactory().create(table, this.entity);
    this.gqlOption = table.gqlOption;
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
            relation.from.field,
            new EntityTypeNode(
              relation.parent.field(relation.from.field).dbType,
              false,
              false,
            ),
          ),
        ],
        new EntityTypeNode(
          EntityName.fromTableName(relation.parent.repository.tableName),
          relation.relation === 'Many',
          false,
        ),
        false,
      );
    };
    const referencedByMethod = (relation: RelationNode) => {
      const to = relation.parent.repository.root.findRepository(
        relation.to.entityName,
      );
      return new FindMethodNode(
        [
          new ParameterNode(
            relation.to.field,
            new EntityTypeNode(
              to.entity.field(relation.to.field).dbType,
              false,
              false,
            ),
          ),
        ],
        new EntityTypeNode(relation.to.entityName, false, false),
        false,
      );
    };
    const methods = [
      new FindMethodNode(
        node.primaryKeys.map(it => {
          const field = node.entity.field(it)!;
          return new ParameterNode(
            it,
            new EntityTypeNode(field.dbType, false, false),
          );
        }),
        new EntityTypeNode(node.entityName, false, true),
        true,
      ),
      ...node.entity.relations.map(refMethods),
      ...node.entity.findReferencedRelations().map(referencedByMethod),
    ];
    return unique(methods);
  }
}
