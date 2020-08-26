import { EntityName } from '../../entity/entityName';

export class ResolverNode {
  constructor(readonly entity: EntityName, readonly relations: RelationNode[]) {}
}

export class RelationNode {
  constructor(
    readonly propertyName: string,
    readonly parentEntity: EntityName,
    readonly relativeEntity: EntityName,
    readonly functionName: string,
    readonly argumentColumns: string[],
  ) {}
}
