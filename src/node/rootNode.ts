import { RepositoryNode } from './repositoryNode';
import { ContextNode } from './gql/contextNode';
import { EntityName } from '../entity/entityName';
import { RelationNode } from './relationNode';
import { DataStoreHandler } from '../entity/dataStore';
import { ContextNodeFactory } from '../parser/nodeFactory/contextNodeFactory';

export class RootNode {
  readonly repositories: RepositoryNode[] = [];
  readonly contexts: ContextNode[];
  constructor(private readonly store: DataStoreHandler) {
    this.contexts = new ContextNodeFactory().create(store.tables);
  }

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
