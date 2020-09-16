import { RepositoryNode } from './node/repositoryNode';
import { RootNode } from './node/rootNode';
import { DataStoreHandler } from '../migration/dataStore';

export class Parser {
  parse(store: DataStoreHandler): RootNode {
    const root = new RootNode(store);
    const repositories = store.tables.map(it => new RepositoryNode(root, it));
    root.addRepository(...repositories);
    return root;
  }
}
