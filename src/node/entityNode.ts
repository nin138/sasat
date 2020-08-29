import { FieldNode } from './fieldNode';
import { EntityName } from '../entity/entityName';
import { RepositoryNode } from './repositoryNode';
import { RelationNode } from './relationNode';
import { TableHandler } from '../entity/table';
import { TypeDefNode } from './gql/typeDefNode';
import { GqlTypeParser } from '../parser/gql/gqlTypeParser';

export class EntityNode {
  readonly entityName: EntityName;
  readonly fields: FieldNode[];
  readonly relations: RelationNode[];
  constructor(readonly repository: RepositoryNode, private table: TableHandler) {
    this.entityName = table.getEntityName();
    this.fields = table.columns.map(column => FieldNode.fromColumn(column, table));
    this.relations = table.getReferenceColumns().map(it => RelationNode.fromReference(this, it));
  }

  typeDefs(): TypeDefNode[] {
    // TODO
    return [GqlTypeParser.getType2(this.table, this), GqlTypeParser.getDeletedType(this.table)];
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
