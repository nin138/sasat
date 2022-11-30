import { EntityTypeNode, TypeNode } from './typeNode.js';
import { EntityNode } from './entityNode.js';
import { ReferenceColumn } from '../../migration/serializable/column.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { EntityName } from './entityName.js';
import { Relation } from '../../migration/data/relation.js';
import { GQLOption } from '../../migration/data/GQLOption.js';
import { TsType } from '../../generator/ts/code/node/type/type.js';

type From = {
  field: string;
  columnName: string;
  gqlOption: GQLOption;
};

type To = {
  field: string;
  columnName: string;
  tableName: string;
  entityName: EntityName;
  gqlOption: GQLOption;
};

export class RelationNode {
  static fromReference(
    entity: EntityNode,
    ref: ReferenceColumn,
    targetFieldName: string,
    targetTableGqlOption: GQLOption,
  ): RelationNode {
    return new RelationNode(
      entity,
      ref.data.reference.relationName,
      ref.data.reference.relation,
      {
        field: ref.data.fieldName,
        columnName: ref.data.columnName,
        gqlOption: ref.table.gqlOption,
      },
      {
        field: targetFieldName,
        tableName: ref.data.reference.targetTable,
        entityName: new EntityName(
          TableHandler.tableNameToEntityName(ref.data.reference.targetTable),
        ),
        columnName: ref.data.reference.targetColumn,
        gqlOption: targetTableGqlOption,
      },
    );
  }

  private constructor(
    readonly parent: EntityNode,
    readonly relationName: string | undefined,
    readonly relation: Relation,
    readonly from: From,
    readonly to: To,
  ) {}

  refPropertyName(): string {
    return this.relationName || this.from.field + this.to.entityName.name;
  }

  referencedByPropertyName(): string {
    return (this.relationName || '') + this.parent.entityName.name;
  }

  refType(): TypeNode {
    return new EntityTypeNode(this.to.entityName, false, false);
  }

  referenceByType(): TypeNode {
    if (this.relation === 'Many')
      return new EntityTypeNode(this.parent.entityName, true, false);
    return new EntityTypeNode(
      this.parent.entityName,
      false,
      this.relation !== 'One',
    );
  }
}
