import { RepositoryNode } from './repository';
import { TypeDefNode } from './gql/typeDefNode';
import { QueryNode } from './gql/queryNode';
import { MutationNode } from './gql/mutationNode';
import { ContextNode } from './gql/contextNode';
import { ResolverNode } from './gql/resolverNode';
import { EntityName } from '../entity/entityName';
import { EntityNode } from './entity';

// TODO remove
export interface GqlNode {
  types: TypeDefNode[];
  queries: QueryNode[];
  mutations: MutationNode[];
  contexts: ContextNode[];
  resolvers: ResolverNode[];
}

export class RootNode {
  readonly repositories: RepositoryNode[] = [];
  constructor(readonly gql: GqlNode) {}

  addRepository(...repositoryNode: RepositoryNode[]) {
    this.repositories.push(...repositoryNode);
  }

  findReferencedEntity(entity: EntityName): EntityNode[] {
    return this.entities().filter(it => it.relations.some(it => it.toEntityName.name === entity.name));
  }

  entities() {
    return this.repositories.map(it => it.entity);
  }
}
