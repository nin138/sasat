import { FieldNode } from './fieldNode';
import { RepositoryNode } from './repositoryNode';
import { RelationNode } from './relationNode';
import { TypeDefNode } from './gql/typeDefNode';
import { TableHandler } from '../../migration/serializable/table';
import { EntityName } from './entityName';

export class EntityNode {
  readonly entityName: EntityName;
  readonly fields: FieldNode[];
  readonly relations: RelationNode[];
  constructor(readonly repository: RepositoryNode, private table: TableHandler) {
    this.entityName = table.getEntityName();
    this.fields = table.columns.map(column => FieldNode.fromColumn(column, table));
    this.relations = table.getReferenceColumns().map(it => RelationNode.fromReference(this, it));
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
