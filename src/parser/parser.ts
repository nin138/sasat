import { RepositoryNode } from './node/repositoryNode.js';
import { RootNode } from './node/rootNode.js';
import { DataStoreHandler } from '../migration/dataStore.js';

export class Parser {
  parse(store: DataStoreHandler): RootNode {
    const root = new RootNode(store);
    const repositories = store.tables.map(it => new RepositoryNode(root, it));
    root.addRepository(...repositories);
    return root;
  }
}
