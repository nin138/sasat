import { RepositoryNode } from './repositoryNode.js';
import { ContextNode } from './gql/contextNode.js';
import { RelationNode } from './relationNode.js';
import { EntityNode } from './entityNode.js';
import { QueryNode } from './gql/queryNode.js';
import { MutationNode } from './gql/mutationNode.js';
import { ContextNodeFactory } from '../nodeFactory/contextNodeFactory.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import { EntityName } from './entityName.js';

export class RootNode {
  readonly repositories: RepositoryNode[] = [];
  readonly contexts: ContextNode[];
  constructor(private readonly store: DataStoreHandler) {
    this.contexts = new ContextNodeFactory().create(store.tables);
  }

  addRepository(...repositoryNode: RepositoryNode[]): void {
    this.repositories.push(...repositoryNode);
  }

  findReferencedRelations(entity: EntityName): RelationNode[] {
    return this.entities()
      .map(it => it.relations.find(it => it.toEntityName.name === entity.name))
      .filter(it => it !== undefined) as RelationNode[];
  }

  entities(): EntityNode[] {
    return this.repositories.map(it => it.entity);
  }

  queries(): QueryNode[] {
    return this.repositories.flatMap(it => it.queries);
  }

  mutations(): MutationNode[] {
    return this.repositories.flatMap(it => it.mutations);
  }

  findRepository(entityName: EntityName): RepositoryNode {
    return this.repositories.find(it => it.entityName.name === entityName.name)!;
  }
}
