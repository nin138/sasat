import { ParameterNode } from '../parameterNode';
import { EntityNode } from '../entityNode';

export class TypeDefNode {
  static new(entity: EntityNode) {
    const reference = entity.relations.map(rel => new ParameterNode(rel.toEntityName.name, rel.refType()));
    const referencedBy = entity
      .findReferencedRelations()
      .map(rel => new ParameterNode(rel.parent.entityName.name, rel.referenceByType()));

    return new TypeDefNode(entity.entityName.name, [
      ...entity.fields.map(it => it.toParam()),
      ...reference,
      ...referencedBy,
    ]);
  }

  static deletedNode(entity: EntityNode) {
    return new TypeDefNode(
      `Deleted${entity.entityName}`,
      entity.identifiableFields().map(it => it.toParam()),
    );
  }
  constructor(readonly typeName: string, readonly params: ParameterNode[]) {}
}
