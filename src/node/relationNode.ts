import { EntityNode } from './entity';
import { EntityName } from '../entity/entityName';

export class RelationNode {
  constructor(
    readonly parent: EntityNode,
    readonly fromColumn: string,
    readonly toColumn: string,
    readonly toEntityName: EntityName,
  ) {}
}
