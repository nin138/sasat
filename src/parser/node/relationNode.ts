import { TypeNode } from './typeNode';
import { EntityNode } from './entityNode';
import { Relation } from '../..';
import { ReferenceColumn } from '../../migration/serializable/column';
import { TableHandler } from '../../migration/serializable/table';
import { EntityName } from './entityName';

export class RelationNode {
  static fromReference(entity: EntityNode, ref: ReferenceColumn): RelationNode {
    return new RelationNode(
      entity,
      ref.data.reference.relationName,
      ref.data.columnName,
      ref.data.reference.targetColumn,
      ref.data.reference.targetTable,
      new EntityName(TableHandler.tableNameToEntityName(ref.data.reference.targetTable)),
      ref.data.reference.relation,
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
    return this.relationName || this.fromColumn + this.toEntityName.name;
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
