import { FieldNode } from './field';

export class EntityNode {
  constructor(public readonly entityName: string, public readonly fields: FieldNode[]) {}
  public identifiableFields(): FieldNode[] {
    return this.fields.filter(it => it.isRequiredToIdentify());
  }

  public onCreateRequiredFields(): FieldNode[] {
    return this.fields.filter(it => it.isRequiredOnCreate());
  }

  public hasDefaultValueFields(): FieldNode[] {
    return this.fields.filter(it => it.hasDefaultValue());
  }
}
