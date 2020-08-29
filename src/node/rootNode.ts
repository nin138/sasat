import { RepositoryNode } from './repository';
import { QueryNode } from './gql/queryNode';
import { MutationNode } from './gql/mutationNode';
import { ContextNode } from './gql/contextNode';
import { ResolverNode } from './gql/resolverNode';
import { EntityName } from '../entity/entityName';
import { RelationNode } from './relationNode';

// TODO remove
export interface GqlNode {
  queries: QueryNode[];
  mutations: MutationNode[];
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
}
