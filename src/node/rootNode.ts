import { RepositoryNode } from './repositoryNode';
import { ContextNode } from './gql/contextNode';
import { ResolverNode } from './gql/resolverNode';
import { EntityName } from '../entity/entityName';
import { RelationNode } from './relationNode';

// TODO remove
export interface GqlNode {
  resolvers: ResolverNode[];
}

export class RootNode {
  readonly repositories: RepositoryNode[] = [];
  constructor(readonly gql: GqlNode, readonly contexts: ContextNode[]) {}

  addRepository(...repositoryNode: RepositoryNode[]) {
    this.repositories.push(...repositoryNode);
  }

  findReferencedRelations(entity: EntityName): RelationNode[] {
    return this.entities()
      .map(it => it.relations.find(it => it.toEntityName.name === entity.name))
      .filter(it => it !== undefined) as RelationNode[];
  }

  entities() {
    return this.repositories.map(it => it.entity);
  }

  queries() {
    return this.repositories.flatMap(it => it.queries);
  }

  mutations() {
    return this.repositories.flatMap(it => it.mutations);
  }
}
