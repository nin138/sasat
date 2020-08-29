import { EntityNode } from './entity';
import { EntityName } from '../entity/entityName';
import { ReferenceColumn } from '../entity/referenceColumn';
import { TableHandler } from '../entity/table';
import { Relation } from '..';
import { TypeNode } from './typeNode';

export class RelationNode {
  static fromReference(entity: EntityNode, ref: ReferenceColumn) {
    return new RelationNode(
      entity,
      ref.data.relationName || ref.table.getEntityName().name,
      ref.data.columnName,
      ref.data.targetColumn,
      new EntityName(TableHandler.tableNameToEntityName(ref.data.targetTable)),
      ref.data.relation,
    );
  }
  constructor(
    readonly parent: EntityNode,
    readonly relationName: string,
    readonly fromColumn: string,
    readonly toColumn: string,
    readonly toEntityName: EntityName,
    readonly relation: Relation,
  ) {}

  refType() {
    return new TypeNode(this.toEntityName, false, false);
  }

  referenceByType() {
    if (this.relation === Relation.Many) return new TypeNode(this.parent.entityName, true, false);
    return new TypeNode(this.parent.entityName, false, this.relation !== Relation.One);
  }
}
