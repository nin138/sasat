import { ParameterNode } from '../parameterNode.js';
import { EntityNode } from '../entityNode.js';

export class TypeDefNode {
  static new(entity: EntityNode): TypeDefNode {
    const reference = entity.relations.filter(it => it.from.gqlOption.enabled).map(
      rel => new ParameterNode(rel.refPropertyName(), rel.refType()),
    );
    const referencedBy = entity
      .findReferencedRelations()
      .filter(it => it.to.gqlOption.enabled)
      .map(
        rel =>
          new ParameterNode(
            rel.referencedByPropertyName(),
            rel.referenceByType(),
          ),
      );

    return new TypeDefNode(entity.entityName.name, [
      ...entity.fields.map(it => it.toParam()),
      ...reference,
      ...referencedBy,
    ]);
  }

  static deletedNode(entity: EntityNode): TypeDefNode {
    return new TypeDefNode(
      `Deleted${entity.entityName}`,
      entity.identifiableFields().map(it => it.toParam()),
    );
  }
  private constructor(readonly typeName: string, readonly params: ParameterNode[]) {}
}
