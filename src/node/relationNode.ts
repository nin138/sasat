import { EntityName } from '../entity/entityName';
import { ReferenceColumn } from '../entity/referenceColumn';
import { TableHandler } from '../entity/table';
import { Relation } from '..';
import { TypeNode } from './typeNode';
import { EntityNode } from './entityNode';

export class RelationNode {
  static fromReference(entity: EntityNode, ref: ReferenceColumn): RelationNode {
    return new RelationNode(
      entity,
      ref.data.relationName || ref.table.getEntityName().name,
      ref.data.columnName,
      ref.data.targetColumn,
      ref.data.targetTable,
      new EntityName(TableHandler.tableNameToEntityName(ref.data.targetTable)),
      ref.data.relation,
    );
  }
  private constructor(
    readonly parent: EntityNode,
    readonly relationName: string | undefined,
    readonly fromColumn: string,
    readonly toColumn: string,
    readonly toTableName: string,
    readonly toEntityName: EntityName,
    readonly relation: Relation,
  ) {}

  refPropertyName(): string {
    return this.relationName || this.toEntityName.name;
  }

  referencedByPropertyName(): string {
    return (this.relationName || '') + this.parent.entityName.name;
  }

  refType(): TypeNode {
    return new TypeNode(this.toEntityName, false, false);
  }

  referenceByType(): TypeNode {
    if (this.relation === Relation.Many) return new TypeNode(this.parent.entityName, true, false);
    return new TypeNode(this.parent.entityName, false, this.relation !== Relation.One);
  }
}
