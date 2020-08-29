import { FieldNode } from './field';
import { EntityName } from '../entity/entityName';
import { RepositoryNode } from './repository';
import { RelationNode } from './relationNode';
import { TableHandler } from '../entity/table';

export class EntityNode {
  readonly entityName: EntityName;
  readonly fields: FieldNode[];
  readonly relations: RelationNode[];
  constructor(readonly repository: RepositoryNode, table: TableHandler) {
    this.entityName = table.getEntityName();
    this.fields = table.columns.map(
      column =>
        new FieldNode(
          column.name,
          column.type,
          table.isColumnPrimary(column.name),
          column.getData().default,
          column.isNullable(),
          column.getData().autoIncrement,
          column.getData().defaultCurrentTimeStamp,
        ),
    );
    this.relations = table
      .getReferenceColumns()
      .map(
        it =>
          new RelationNode(
            this,
            it.data.columnName,
            it.data.targetColumn,
            new EntityName(TableHandler.tableNameToEntityName(it.data.targetTable)),
          ),
      );
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

  public primaryFields(): FieldNode[] {
    return this.fields.filter(it => it.isPrimary);
  }

  public findReferencedEntities(): EntityNode[] {
    return this.repository.root.findReferencedEntity(this.entityName);
  }
}
