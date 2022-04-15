import { FieldNode } from './fieldNode.js';
import { RepositoryNode } from './repositoryNode.js';
import { RelationNode } from './relationNode.js';
import { TypeDefNode } from './gql/typeDefNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { EntityName } from './entityName.js';

export class EntityNode {
  readonly entityName: EntityName;
  readonly fields: FieldNode[];
  readonly relations: RelationNode[];
  constructor(readonly repository: RepositoryNode, table: TableHandler) {
    this.entityName = table.getEntityName();
    this.fields = table.columns.map(column => FieldNode.fromColumn(column, table));
    this.relations = table
      .getReferenceColumns()
      .map(it =>
        RelationNode.fromReference(
          this,
          it,
          table.store.table(it.data.reference.targetTable).column(it.data.reference.targetColumn).fieldName(),
        ),
      );
  }

  field(fieldName: string): FieldNode {
    return this.fields.find(it => it.fieldName === fieldName)!;
  }

  allTypeDefs(): TypeDefNode[] {
    return [this.typeDef(), this.deleteTypeDef()];
  }

  typeDef(): TypeDefNode {
    return TypeDefNode.new(this);
  }

  deleteTypeDef(): TypeDefNode {
    return TypeDefNode.deletedNode(this);
  }

  public identifiableFields(): FieldNode[] {
    return this.fields.filter(it => it.isRequiredToIdentify());
  }

  public dataFields(): FieldNode[] {
    return this.fields.filter(it => !it.isRequiredToIdentify());
  }

  public onCreateRequiredFields(): FieldNode[] {
    return this.fields.filter(it => it.isRequiredOnCreate());
  }
  public onCreateOptionalFields(): FieldNode[] {
    return this.fields.filter(it => !it.isRequiredOnCreate());
  }

  public hasDefaultValueFields(): FieldNode[] {
    return this.fields.filter(it => it.hasDefaultValue());
  }

  public findReferencedRelations(): RelationNode[] {
    return this.repository.root.findReferencedRelations(this.entityName);
  }
}
