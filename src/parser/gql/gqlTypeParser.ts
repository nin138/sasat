import { TableHandler } from '../../entity/table';
import { TypeDefNode } from '../../node/gql/typeDefNode';
import { Parser } from '../parser';
import { EntityNode } from '../../node/entity';
import { ParameterNode } from '../../node/parameterNode';

export class GqlTypeParser {
  static getType2(table: TableHandler, entity: EntityNode) {
    const reference = entity.relations.map(rel => new ParameterNode(rel.toEntityName.name, rel.refType()));
    const referencedBy = entity
      .findReferencedRelations()
      .map(rel => new ParameterNode(rel.parent.entityName.name, rel.referenceByType()));

    return new TypeDefNode(table.getEntityName().name, [
      ...entity.fields.map(it => it.toParam()),
      ...reference,
      ...referencedBy,
    ]);
  }

  static getDeletedType(table: TableHandler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entity = Parser.tableToEntityNode(null as any, table);
    return new TypeDefNode(
      `Deleted${table.getEntityName()}`,
      entity.identifiableFields().map(it => it.toParam()),
    );
  }
}
