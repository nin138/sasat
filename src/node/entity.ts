import { FieldNode } from './field';
import { EntityName } from '../entity/entityName';

export class EntityNode {
  constructor(public readonly entityName: EntityName, public readonly fields: FieldNode[]) {}
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
}
